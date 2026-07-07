import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/auth-user.interface';
import { AdCompetitionGroup } from '../entities/ad-competition-group.entity';
import { AdDelivery } from '../entities/ad-delivery.entity';
import { AdPlacement } from '../entities/ad-placement.entity';
import {
  Ad,
  AdCreativeSize,
  AdDisplayMode,
  AdStatus,
  AdType,
} from '../entities/ad.entity';
import { AdminAdsQueryDto } from './dto/admin-ads-query.dto';
import { CreateAdCompetitionGroupDto } from './dto/create-ad-competition-group.dto';
import { CreateAdDto } from './dto/create-ad.dto';
import { TrackAdEventDto } from './dto/track-ad-event.dto';
import { UpdateAdCompetitionGroupDto } from './dto/update-ad-competition-group.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { UpdateAdStatusDto } from './dto/update-ad-status.dto';

type TrackingPayload = {
  type: 'ad-tracking';
  adId: string;
  deliveryId: string;
  placement: string;
};

type AdMetrics = {
  impressionsCount: number;
  clicksCount: number;
  clickThroughRate: number;
};

const AD_DISPLAY_MODES: AdDisplayMode[] = ['native', 'image_only'];
const AD_CREATIVE_SIZES: AdCreativeSize[] = [
  'auto',
  'banner_468x60',
  'leaderboard_728x90',
  'mobile_leaderboard_320x50',
  'square_250x250',
  'small_rectangle_200x200',
  'medium_rectangle_300x250',
  'large_rectangle_336x280',
  'half_page_300x600',
  'wide_skyscraper_160x600',
  'skyscraper_120x600',
];

@Injectable()
export class AdsService {
  constructor(
    @InjectRepository(Ad)
    private readonly adsRepository: Repository<Ad>,
    @InjectRepository(AdDelivery)
    private readonly deliveriesRepository: Repository<AdDelivery>,
    @InjectRepository(AdPlacement)
    private readonly placementsRepository: Repository<AdPlacement>,
    @InjectRepository(AdCompetitionGroup)
    private readonly competitionGroupsRepository: Repository<AdCompetitionGroup>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  async listPlacements() {
    const placements = await this.placementsRepository.find({
      order: {
        sortOrder: 'ASC',
        name: 'ASC',
      },
    });

    const placementCounts = await this.adsRepository
      .createQueryBuilder('ad')
      .innerJoin('ad.placements', 'placement')
      .select('placement.id', 'placementId')
      .addSelect('COUNT(DISTINCT ad.id)', 'adsCount')
      .groupBy('placement.id')
      .getRawMany<{ placementId: string; adsCount: string }>();

    const countByPlacementId = new Map(
      placementCounts.map((row) => [row.placementId, Number(row.adsCount)]),
    );

    return placements.map((placement) => ({
      ...this.toPlacementResponse(placement),
      adsCount: countByPlacementId.get(placement.id) || 0,
    }));
  }

  async listCompetitionGroups() {
    const groups = await this.competitionGroupsRepository.find({
      order: {
        name: 'ASC',
      },
    });

    const groupCounts = await this.adsRepository
      .createQueryBuilder('ad')
      .select('ad.competition_group_id', 'competitionGroupId')
      .addSelect('COUNT(*)', 'adsCount')
      .where('ad.competition_group_id IS NOT NULL')
      .groupBy('ad.competition_group_id')
      .getRawMany<{ competitionGroupId: string; adsCount: string }>();

    const countByGroupId = new Map(
      groupCounts.map((row) => [row.competitionGroupId, Number(row.adsCount)]),
    );

    return groups.map((group) => ({
      ...this.toCompetitionGroupResponse(group),
      adsCount: countByGroupId.get(group.id) || 0,
    }));
  }

  async createCompetitionGroup(
    createAdCompetitionGroupDto: CreateAdCompetitionGroupDto,
  ) {
    const name = createAdCompetitionGroupDto.name?.trim();
    if (!name) {
      throw new BadRequestException('Nome do grupo é obrigatório');
    }

    await this.ensureCompetitionGroupNameAvailable(name);

    const code = await this.generateUniqueCompetitionGroupCode(name);
    const group = this.competitionGroupsRepository.create({
      code,
      name,
      description: createAdCompetitionGroupDto.description?.trim() || null,
    });

    const savedGroup = await this.competitionGroupsRepository.save(group);
    return {
      ...this.toCompetitionGroupResponse(savedGroup),
      adsCount: 0,
    };
  }

  async updateCompetitionGroup(
    id: string,
    updateAdCompetitionGroupDto: UpdateAdCompetitionGroupDto,
  ) {
    const group = await this.findCompetitionGroupOrFail(id);
    const nextName = updateAdCompetitionGroupDto.name?.trim() || group.name;

    if (!nextName) {
      throw new BadRequestException('Nome do grupo é obrigatório');
    }

    await this.ensureCompetitionGroupNameAvailable(nextName, group.id);

    group.name = nextName;
    group.code = await this.generateUniqueCompetitionGroupCode(nextName, group.id);
    group.description =
      updateAdCompetitionGroupDto.description !== undefined
        ? updateAdCompetitionGroupDto.description?.trim() || null
        : group.description;

    const savedGroup = await this.competitionGroupsRepository.save(group);
    const adsCount = await this.adsRepository.count({
      where: { competitionGroupId: savedGroup.id },
    });

    return {
      ...this.toCompetitionGroupResponse(savedGroup),
      adsCount,
    };
  }

  async removeCompetitionGroup(id: string) {
    const group = await this.findCompetitionGroupOrFail(id);
    const linkedAds = await this.adsRepository.count({
      where: { competitionGroupId: group.id },
    });

    if (linkedAds > 0) {
      throw new BadRequestException(
        'Este grupo ainda está vinculado a anúncios. Remova ou altere os anúncios antes de excluir o grupo.',
      );
    }

    await this.competitionGroupsRepository.remove(group);
    return { id, deleted: true };
  }

  async findAllForAdmin(query: AdminAdsQueryDto) {
    const {
      status,
      type,
      placementCode,
      competitionGroupId,
      validFrom,
      validTo,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    if (status && !this.isAdStatus(status)) {
      throw new BadRequestException('Status do anúncio inválido');
    }

    if (type && !this.isAdType(type)) {
      throw new BadRequestException('Tipo do anúncio inválido');
    }

    const builder = this.adsRepository
      .createQueryBuilder('ad')
      .leftJoinAndSelect('ad.creator', 'creator')
      .leftJoinAndSelect('ad.competitionGroup', 'competitionGroup')
      .leftJoinAndSelect('ad.placements', 'placement')
      .distinct(true)
      .orderBy('ad.criado_em', 'DESC');

    if (status) {
      builder.andWhere('ad.status = :status', { status });
    }

    if (type) {
      builder.andWhere('ad.type = :type', { type });
    }

    if (placementCode?.trim()) {
      builder.innerJoin(
        'ad.placements',
        'filterPlacement',
        'filterPlacement.code = :placementCode',
        { placementCode: placementCode.trim() },
      );
    }

    if (competitionGroupId?.trim()) {
      builder.andWhere('ad.competition_group_id = :competitionGroupId', {
        competitionGroupId: competitionGroupId.trim(),
      });
    }

    if (validFrom) {
      builder.andWhere('ad.ends_at >= :validFrom', {
        validFrom: new Date(validFrom).toISOString(),
      });
    }

    if (validTo) {
      builder.andWhere('ad.starts_at <= :validTo', {
        validTo: new Date(validTo).toISOString(),
      });
    }

    const [items, total] = await builder.skip(skip).take(limit).getManyAndCount();

    return {
      items: items.map((ad) => this.toAdminResponse(ad)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(createAdDto: CreateAdDto, adminUser: AuthenticatedUser) {
    const payload = await this.prepareAdPayload(createAdDto);
    const ad = this.adsRepository.create({
      ...payload,
      createdBy: adminUser.id,
    });
    const savedAd = await this.adsRepository.save(ad);
    const reloadedAd = await this.findAdOrFail(savedAd.id);

    return this.toAdminResponse(reloadedAd);
  }

  async update(id: string, updateAdDto: UpdateAdDto) {
    const existingAd = await this.findAdOrFail(id);
    const payload = await this.prepareAdPayload(updateAdDto, existingAd);

    Object.assign(existingAd, payload);

    const savedAd = await this.adsRepository.save(existingAd);
    const reloadedAd = await this.findAdOrFail(savedAd.id);

    return this.toAdminResponse(reloadedAd);
  }

  async updateStatus(id: string, updateStatusDto: UpdateAdStatusDto) {
    const { status } = updateStatusDto;

    if (!this.isAdStatus(status)) {
      throw new BadRequestException('Status do anúncio inválido');
    }

    return this.update(id, { status });
  }

  async remove(id: string) {
    const ad = await this.findAdOrFail(id);
    await this.adsRepository.remove(ad);

    return { id, deleted: true };
  }

  async getAdForPlacement(placementCode: string) {
    if (!placementCode?.trim()) {
      throw new BadRequestException('Informe um placement válido');
    }

    const normalizedPlacementCode = placementCode.trim();
    const placement = await this.placementsRepository.findOne({
      where: { code: normalizedPlacementCode },
    });

    if (!placement) {
      throw new NotFoundException('Placement não encontrado');
    }

    const now = new Date();
    const activeAds = await this.adsRepository
      .createQueryBuilder('ad')
      .innerJoin('ad.placements', 'placement', 'placement.code = :placementCode', {
        placementCode: normalizedPlacementCode,
      })
      .leftJoinAndSelect('ad.competitionGroup', 'competitionGroup')
      .leftJoinAndSelect('ad.placements', 'selectedPlacements')
      .where('ad.status = :status', { status: 'active' })
      .andWhere('ad.starts_at <= :now', { now: now.toISOString() })
      .andWhere('ad.ends_at >= :now', { now: now.toISOString() })
      .orderBy('ad.priority', 'DESC')
      .getMany();

    const eligibleAds = activeAds.filter((ad) => this.hasAvailableQuota(ad));
    if (eligibleAds.length === 0) {
      return null;
    }

    const winner = this.pickWinningAd(eligibleAds);
    const delivery = await this.deliveriesRepository.save(
      this.deliveriesRepository.create({
        adId: winner.id,
        placement: normalizedPlacementCode,
      }),
    );

    const trackingToken = this.jwtService.sign(
      {
        type: 'ad-tracking',
        adId: winner.id,
        deliveryId: delivery.id,
        placement: normalizedPlacementCode,
      } satisfies TrackingPayload,
      {
        expiresIn: '24h',
      },
    );

    return {
      id: winner.id,
      type: winner.type,
      title: winner.title,
      content: winner.content,
      imageUrl: winner.imageUrl,
      imageMobileUrl: winner.imageMobileUrl,
      imageAltText: winner.imageAltText,
      displayMode: winner.displayMode,
      creativeSize: winner.creativeSize,
      targetUrl: winner.targetUrl,
      placement: normalizedPlacementCode,
      placements: winner.placements?.map((adPlacement) =>
        this.toPlacementResponse(adPlacement),
      ),
      competitionGroup: winner.competitionGroup
        ? this.toCompetitionGroupResponse(winner.competitionGroup)
        : null,
      startsAt: winner.startsAt,
      endsAt: winner.endsAt,
      trackingToken,
    };
  }

  async trackImpression(id: string, trackAdEventDto: TrackAdEventDto) {
    return this.trackDeliveryEvent(id, trackAdEventDto, 'impression');
  }

  async trackClick(id: string, trackAdEventDto: TrackAdEventDto) {
    return this.trackDeliveryEvent(id, trackAdEventDto, 'click');
  }

  private async trackDeliveryEvent(
    adId: string,
    { trackingToken }: TrackAdEventDto,
    eventType: 'impression' | 'click',
  ) {
    const tokenPayload = this.verifyTrackingToken(trackingToken);

    if (tokenPayload.adId !== adId) {
      throw new BadRequestException(
        'Tracking token inválido para o anúncio informado',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const deliveryRepository = manager.getRepository(AdDelivery);
      const adRepository = manager.getRepository(Ad);
      const delivery = await deliveryRepository.findOne({
        where: { id: tokenPayload.deliveryId, adId },
      });

      if (!delivery) {
        throw new NotFoundException('Entrega do anúncio não encontrada');
      }

      let impressionsIncrement = 0;
      let clicksIncrement = 0;
      const now = new Date();

      if (eventType === 'impression' || eventType === 'click') {
        const impressionResult = await deliveryRepository
          .createQueryBuilder()
          .update(AdDelivery)
          .set({ impressionTrackedAt: now })
          .where('id = :id', { id: delivery.id })
          .andWhere('ad_id = :adId', { adId })
          .andWhere('impression_tracked_at IS NULL')
          .execute();

        impressionsIncrement = impressionResult.affected ? 1 : 0;
      }

      if (eventType === 'click') {
        const clickResult = await deliveryRepository
          .createQueryBuilder()
          .update(AdDelivery)
          .set({ clickTrackedAt: now })
          .where('id = :id', { id: delivery.id })
          .andWhere('ad_id = :adId', { adId })
          .andWhere('click_tracked_at IS NULL')
          .execute();

        clicksIncrement = clickResult.affected ? 1 : 0;
      }

      if (impressionsIncrement > 0) {
        await adRepository.increment({ id: adId }, 'impressionsCount', 1);
      }

      if (clicksIncrement > 0) {
        await adRepository.increment({ id: adId }, 'clicksCount', 1);
      }

      const updatedAd = await adRepository.findOne({ where: { id: adId } });
      if (!updatedAd) {
        throw new NotFoundException('Anúncio não encontrado');
      }

      return {
        recorded: impressionsIncrement > 0 || clicksIncrement > 0,
        impressionRecorded: impressionsIncrement > 0,
        clickRecorded: clicksIncrement > 0,
        metrics: this.toMetrics(updatedAd),
      };
    });
  }

  private async prepareAdPayload(
    dto: CreateAdDto | UpdateAdDto,
    existingAd?: Ad,
  ): Promise<Partial<Ad>> {
    const nextType = (dto.type ?? existingAd?.type) as AdType | undefined;
    const nextStatus = (dto.status ?? existingAd?.status ?? 'inactive') as
      | AdStatus
      | undefined;
    const nextTitle = dto.title ?? existingAd?.title;
    const nextStartsAt = dto.startsAt ? new Date(dto.startsAt) : existingAd?.startsAt;
    const nextEndsAt = dto.endsAt ? new Date(dto.endsAt) : existingAd?.endsAt;
    const nextPriority = dto.priority ?? existingAd?.priority;
    const nextContent = dto.content ?? existingAd?.content ?? null;
    const nextImageUrl = dto.imageUrl ?? existingAd?.imageUrl ?? null;
    const nextImageMobileUrl =
      dto.imageMobileUrl ?? existingAd?.imageMobileUrl ?? null;
    const nextImageAltText = dto.imageAltText ?? existingAd?.imageAltText ?? null;
    const nextDisplayMode = (dto.displayMode ??
      existingAd?.displayMode ??
      'native') as AdDisplayMode;
    const nextCreativeSize = (dto.creativeSize ??
      existingAd?.creativeSize ??
      'auto') as AdCreativeSize;
    const nextPlacements =
      dto.placements !== undefined
        ? await this.resolvePlacements(dto.placements)
        : existingAd?.placements || [];
    const nextCompetitionGroup =
      dto.competitionGroupId !== undefined
        ? await this.resolveCompetitionGroup(dto.competitionGroupId)
        : existingAd?.competitionGroup || null;

    if (!this.isAdType(nextType)) {
      throw new BadRequestException('Tipo do anúncio inválido');
    }

    if (!this.isAdStatus(nextStatus)) {
      throw new BadRequestException('Status do anúncio inválido');
    }

    if (!this.isAdDisplayMode(nextDisplayMode)) {
      throw new BadRequestException('Modo de exibiÃ§Ã£o do anÃºncio invÃ¡lido');
    }

    if (!this.isAdCreativeSize(nextCreativeSize)) {
      throw new BadRequestException('Formato criativo do anÃºncio invÃ¡lido');
    }

    if (nextDisplayMode === 'image_only' && nextType !== 'image') {
      throw new BadRequestException(
        'AnÃºncios somente imagem devem ser do tipo image',
      );
    }

    if (!nextTitle?.trim()) {
      throw new BadRequestException('Título do anúncio é obrigatório');
    }

    if (!nextPlacements.length) {
      throw new BadRequestException(
        'Selecione pelo menos um local de exibição para o anúncio',
      );
    }

    if (!nextStartsAt || Number.isNaN(nextStartsAt.getTime())) {
      throw new BadRequestException('startsAt deve ser uma data válida');
    }

    if (!nextEndsAt || Number.isNaN(nextEndsAt.getTime())) {
      throw new BadRequestException('endsAt deve ser uma data válida');
    }

    if (nextStartsAt >= nextEndsAt) {
      throw new BadRequestException(
        'O período do anúncio é inválido: startsAt deve ser anterior a endsAt',
      );
    }

    if (
      nextPriority === undefined ||
      !Number.isInteger(nextPriority) ||
      nextPriority < 1
    ) {
      throw new BadRequestException(
        'Priority deve ser um inteiro maior que zero',
      );
    }

    if (nextType === 'image' && !nextImageUrl?.trim()) {
      throw new BadRequestException(
        'Anúncios do tipo image devem possuir imageUrl',
      );
    }

    if (nextType === 'text' && !nextContent?.trim()) {
      throw new BadRequestException(
        'Anúncios do tipo text devem possuir conteúdo textual',
      );
    }

    return {
      type: nextType,
      title: nextTitle.trim(),
      content: dto.content !== undefined ? dto.content?.trim() || null : nextContent,
      imageUrl:
        dto.imageUrl !== undefined ? dto.imageUrl?.trim() || null : nextImageUrl,
      imageMobileUrl:
        dto.imageMobileUrl !== undefined
          ? dto.imageMobileUrl?.trim() || null
          : nextImageMobileUrl,
      imageAltText:
        dto.imageAltText !== undefined
          ? dto.imageAltText?.trim() || null
          : nextImageAltText,
      displayMode: nextDisplayMode,
      creativeSize: nextCreativeSize,
      targetUrl:
        dto.targetUrl !== undefined
          ? dto.targetUrl?.trim() || null
          : existingAd?.targetUrl ?? null,
      startsAt: nextStartsAt,
      endsAt: nextEndsAt,
      priority: nextPriority,
      status: nextStatus,
      placements: nextPlacements,
      competitionGroup: nextCompetitionGroup,
      competitionGroupId: nextCompetitionGroup?.id || null,
      impressionsLimit:
        dto.impressionsLimit !== undefined
          ? dto.impressionsLimit
          : existingAd?.impressionsLimit ?? null,
      clicksLimit:
        dto.clicksLimit !== undefined
          ? dto.clicksLimit
          : existingAd?.clicksLimit ?? null,
    };
  }

  private hasAvailableQuota(ad: Ad) {
    const belowImpressionsLimit =
      ad.impressionsLimit === null || ad.impressionsCount < ad.impressionsLimit;
    const belowClicksLimit =
      ad.clicksLimit === null || ad.clicksCount < ad.clicksLimit;

    return belowImpressionsLimit && belowClicksLimit;
  }

  private pickWinningAd(ads: Ad[]) {
    const groups = new Map<string, Ad[]>();

    ads.forEach((ad) => {
      const key = ad.competitionGroupId || '__default__';
      const adsInGroup = groups.get(key) || [];
      adsInGroup.push(ad);
      groups.set(key, adsInGroup);
    });

    const groupWinners = Array.from(groups.values()).map((groupAds) =>
      this.pickWeightedByPriority(groupAds),
    );

    return this.pickWeightedByPriority(groupWinners);
  }

  private pickWeightedByPriority(ads: Ad[]) {
    const totalWeight = ads.reduce(
      (sum, ad) => sum + Math.max(1, ad.priority || 1),
      0,
    );
    const threshold = Math.random() * totalWeight;
    let weightCursor = 0;

    for (const ad of ads) {
      weightCursor += Math.max(1, ad.priority || 1);
      if (threshold < weightCursor) {
        return ad;
      }
    }

    return ads[ads.length - 1];
  }

  private verifyTrackingToken(trackingToken: string): TrackingPayload {
    try {
      const payload = this.jwtService.verify<TrackingPayload>(trackingToken);
      if (
        payload.type !== 'ad-tracking' ||
        !payload.adId ||
        !payload.deliveryId ||
        !payload.placement
      ) {
        throw new Error('invalid-payload');
      }

      return payload;
    } catch {
      throw new BadRequestException('Tracking token inválido ou expirado');
    }
  }

  private async resolvePlacements(placementCodes: string[]) {
    const normalizedCodes = Array.from(
      new Set(
        (placementCodes || [])
          .map((placementCode) => placementCode?.trim())
          .filter(Boolean),
      ),
    );

    if (normalizedCodes.length === 0) {
      return [];
    }

    const placements = await this.placementsRepository.find({
      where: {
        code: In(normalizedCodes),
      },
      order: {
        sortOrder: 'ASC',
        name: 'ASC',
      },
    });

    const foundCodes = new Set(placements.map((placement) => placement.code));
    const missingCodes = normalizedCodes.filter((code) => !foundCodes.has(code));
    if (missingCodes.length > 0) {
      throw new BadRequestException(
        `Locais de exibição inválidos: ${missingCodes.join(', ')}`,
      );
    }

    return placements;
  }

  private async resolveCompetitionGroup(competitionGroupId?: string | null) {
    const normalizedCompetitionGroupId = competitionGroupId?.trim();
    if (!normalizedCompetitionGroupId) {
      return null;
    }

    return this.findCompetitionGroupOrFail(normalizedCompetitionGroupId);
  }

  private async findAdOrFail(id: string) {
    const ad = await this.adsRepository.findOne({
      where: { id },
      relations: ['creator', 'placements', 'competitionGroup'],
    });

    if (!ad) {
      throw new NotFoundException('Anúncio não encontrado');
    }

    return ad;
  }

  private async findCompetitionGroupOrFail(id: string) {
    const group = await this.competitionGroupsRepository.findOne({
      where: { id },
    });

    if (!group) {
      throw new NotFoundException('Grupo de concorrência não encontrado');
    }

    return group;
  }

  private async ensureCompetitionGroupNameAvailable(
    name: string,
    currentGroupId?: string,
  ) {
    const existingGroup = await this.competitionGroupsRepository
      .createQueryBuilder('group')
      .where('LOWER(group.name) = LOWER(:name)', { name })
      .getOne();

    if (existingGroup && existingGroup.id !== currentGroupId) {
      throw new BadRequestException(
        'Já existe um grupo de concorrência com este nome',
      );
    }
  }

  private async generateUniqueCompetitionGroupCode(
    name: string,
    currentGroupId?: string,
  ) {
    const baseCode = this.slugify(name) || 'grupo';
    let suffix = 0;

    while (true) {
      const candidateCode =
        suffix === 0 ? baseCode : `${baseCode}-${suffix + 1}`;
      const existingGroup = await this.competitionGroupsRepository.findOne({
        where: { code: candidateCode },
      });

      if (!existingGroup || existingGroup.id === currentGroupId) {
        return candidateCode;
      }

      suffix += 1;
    }
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }

  private toAdminResponse(ad: Ad) {
    return {
      id: ad.id,
      type: ad.type,
      title: ad.title,
      content: ad.content,
      imageUrl: ad.imageUrl,
      imageMobileUrl: ad.imageMobileUrl,
      imageAltText: ad.imageAltText,
      displayMode: ad.displayMode,
      creativeSize: ad.creativeSize,
      targetUrl: ad.targetUrl,
      placements: (ad.placements || [])
        .slice()
        .sort((placementA, placementB) => placementA.sortOrder - placementB.sortOrder)
        .map((placement) => this.toPlacementResponse(placement)),
      startsAt: ad.startsAt,
      endsAt: ad.endsAt,
      priority: ad.priority,
      status: ad.status,
      competitionGroup: ad.competitionGroup
        ? this.toCompetitionGroupResponse(ad.competitionGroup)
        : null,
      competitionGroupId: ad.competitionGroupId,
      impressionsLimit: ad.impressionsLimit,
      clicksLimit: ad.clicksLimit,
      createdBy: ad.createdBy,
      createdAt: ad.criado_em,
      updatedAt: ad.atualizado_em,
      metrics: this.toMetrics(ad),
      isEligibleNow: this.isEligibleNow(ad),
      creator: ad.creator
        ? {
            id: ad.creator.id,
            nome: ad.creator.nome,
            email: ad.creator.email,
            role: ad.creator.role,
          }
        : null,
    };
  }

  private toPlacementResponse(placement: AdPlacement) {
    return {
      id: placement.id,
      code: placement.code,
      name: placement.name,
      description: placement.description,
      sortOrder: placement.sortOrder,
    };
  }

  private toCompetitionGroupResponse(group: AdCompetitionGroup) {
    return {
      id: group.id,
      code: group.code,
      name: group.name,
      description: group.description,
    };
  }

  private toMetrics(ad: Ad): AdMetrics {
    return {
      impressionsCount: ad.impressionsCount,
      clicksCount: ad.clicksCount,
      clickThroughRate:
        ad.impressionsCount > 0 ? ad.clicksCount / ad.impressionsCount : 0,
    };
  }

  private isEligibleNow(ad: Ad) {
    const now = new Date();
    return (
      ad.status === 'active' &&
      ad.startsAt <= now &&
      ad.endsAt >= now &&
      this.hasAvailableQuota(ad)
    );
  }

  private isAdType(type?: string): type is AdType {
    return type === 'image' || type === 'text';
  }

  private isAdStatus(status?: string): status is AdStatus {
    return status === 'active' || status === 'inactive';
  }

  private isAdDisplayMode(displayMode?: string): displayMode is AdDisplayMode {
    return AD_DISPLAY_MODES.includes(displayMode as AdDisplayMode);
  }

  private isAdCreativeSize(creativeSize?: string): creativeSize is AdCreativeSize {
    return AD_CREATIVE_SIZES.includes(creativeSize as AdCreativeSize);
  }
}
