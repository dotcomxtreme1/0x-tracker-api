const _ = require('lodash');

const { ETH_TOKEN_DECIMALS } = require('../constants');
const buildFillsQuery = require('../fills/build-fills-query');
const elasticsearch = require('../util/elasticsearch');
const formatTokenAmount = require('../tokens/format-token-amount');
const getPreviousPeriod = require('../util/get-previous-period');
const getPercentageChange = require('../util/get-percentage-change');

const getBasicStatsForDates = async (dateFrom, dateTo, filters) => {
  const results = await elasticsearch.getClient().search({
    index: 'fills',
    body: {
      aggs: {
        fillCount: {
          value_count: { field: '_id' },
        },
        fillVolume: {
          sum: { field: 'value' },
        },
        protocolFeesETH: {
          sum: { field: 'protocolFeeETH' },
        },
        protocolFeesUSD: {
          sum: { field: 'protocolFeeUSD' },
        },
        tradeCount: {
          sum: { field: 'tradeCountContribution' },
        },
        tradeVolume: {
          sum: { field: 'tradeVolume' },
        },
      },
      size: 0,
      query: buildFillsQuery({ ...filters, dateFrom, dateTo }),
    },
  });

  const getValue = key => _.get(results.body.aggregations, `${key}.value`);

  return {
    fillCount: getValue('fillCount'),
    fillVolume: getValue('fillVolume'),
    protocolFees: {
      ETH: formatTokenAmount(getValue('protocolFeesETH'), ETH_TOKEN_DECIMALS),
      USD: getValue('protocolFeesUSD'),
    },
    tradeCount: getValue('tradeCount'),
    tradeVolume: getValue('tradeVolume'),
  };
};

const computeNetworkStatsForDates = async (dateFrom, dateTo, filters = {}) => {
  const { prevDateFrom, prevDateTo } = getPreviousPeriod(dateFrom, dateTo);

  const specifiedPeriodStats = await getBasicStatsForDates(
    dateFrom,
    dateTo,
    filters,
  );

  const previousPeriodStats = await getBasicStatsForDates(
    prevDateFrom,
    prevDateTo,
    filters,
  );

  return {
    fillCount: specifiedPeriodStats.fillCount,
    fillCountChange: getPercentageChange(
      previousPeriodStats.fillCount,
      specifiedPeriodStats.fillCount,
    ),
    fillVolume: specifiedPeriodStats.fillVolume,
    fillVolumeChange: getPercentageChange(
      previousPeriodStats.fillVolume,
      specifiedPeriodStats.fillVolume,
    ),
    protocolFees: specifiedPeriodStats.protocolFees,
    protocolFeesChange: getPercentageChange(
      previousPeriodStats.protocolFees.USD,
      specifiedPeriodStats.protocolFees.USD,
    ),
    tradeCount: specifiedPeriodStats.tradeCount,
    tradeCountChange: getPercentageChange(
      previousPeriodStats.tradeCount,
      specifiedPeriodStats.tradeCount,
    ),
    tradeVolume: specifiedPeriodStats.tradeVolume,
    tradeVolumeChange: getPercentageChange(
      previousPeriodStats.tradeVolume,
      specifiedPeriodStats.tradeVolume,
    ),
  };
};

module.exports = computeNetworkStatsForDates;
