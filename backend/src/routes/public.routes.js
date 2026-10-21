const express = require('express');
const categoryDal = require('../dal/categoryDal');
const providerDal = require('../dal/providerDal');
const serviceDal = require('../dal/serviceDal');
const coachDal = require('../dal/coachDal');
const reviewDal = require('../dal/reviewDal');
const { success, fail, asyncHandler, getPagination } = require('../utils/helpers');

const router = express.Router();

router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    return success(res, await categoryDal.listPublic());
  })
);

router.get(
  '/venues',
  asyncHandler(async (req, res) => {
    const { page, pageSize, offset } = getPagination(req.query);
    const { keyword, categoryId, city, sort } = req.query;
    const { rows, count } = await providerDal.listPublic({
      keyword,
      categoryId,
      city,
      sort,
      limit: pageSize,
      offset
    });
    return success(res, { list: rows, total: count, page, pageSize });
  })
);

router.get(
  '/venues/:id',
  asyncHandler(async (req, res) => {
    const provider = await providerDal.findById(Number(req.params.id));
    if (!provider || provider.status !== 'approved') {
      return fail(res, 404, '场馆不存在或尚未通过审核');
    }
    const [services, coaches, reviews, ratingSummary] = await Promise.all([
      serviceDal.findVenueServices(provider.id),
      coachDal.listActive(provider.id),
      reviewDal.listForVenue(provider.id, 20),
      reviewDal.ratingSummaryForProvider(provider.id)
    ]);
    const plain = provider.get({ plain: true });
    return success(res, {
      provider: { ...plain, owner_name: plain.owner?.nickname },
      services,
      coaches,
      reviews,
      ratingSummary
    });
  })
);

router.get(
  '/services',
  asyncHandler(async (req, res) => {
    const { page, pageSize, offset } = getPagination(req.query);
    const { keyword, categoryId, minPrice, maxPrice, providerId, sort } = req.query;
    const { rows, count } = await serviceDal.listPublic({
      keyword,
      categoryId,
      minPrice,
      maxPrice,
      providerId,
      sort,
      limit: pageSize,
      offset
    });
    return success(res, { list: rows, total: count, page, pageSize });
  })
);

router.get(
  '/services/:id',
  asyncHandler(async (req, res) => {
    const service = await serviceDal.findWithProvider(Number(req.params.id));
    if (!service || service.status !== 'on' || service.provider.status !== 'approved') {
      return fail(res, 404, '服务不存在或已下架');
    }
    const plain = service.get({ plain: true });
    const [coaches, reviews] = await Promise.all([
      coachDal.listActive(service.provider_id),
      serviceDal.getServiceReviews(service.id, 10)
    ]);
    return success(res, {
      service: {
        ...plain,
        provider_name: plain.provider.name,
        provider_rating: plain.provider.rating,
        provider_phone: plain.provider.phone,
        address: plain.provider.address,
        city: plain.provider.city,
        business_hours: plain.provider.business_hours,
        category_name: plain.category.name
      },
      coaches,
      reviews
    });
  })
);

module.exports = router;
