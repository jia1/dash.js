import FactoryMaker from '../../../core/FactoryMaker';
import Debug from '../../../core/Debug';
import SwitchRequest from '../SwitchRequest.js';
import { LINEAR_F, BBA0 } from './BBAAlgorithm';

function BBARule(config) {

    const context = this.context;
    const log = Debug(context).getInstance().log;

    const dashMetrics = config.dashMetrics;
    const metricsModel = config.metricsModel;
    const mediaPlayerModel = config.mediaPlayerModel;

    let state;

    function getMaxIndex(rulesContext) {
        const switchRequest = SwitchRequest(context).create();

        const mediaType = rulesContext.getMediaType();
        const metrics = metricsModel.getReadOnlyMetricsFor(mediaType);

        const streamInfo = rulesContext.getStreamInfo();
        const isDynamic = streamInfo && streamInfo.manifestInfo && streamInfo.manifestInfo.isDynamic;

        const abrController = rulesContext.getAbrController();
        const throughputHistory = abrController.getThroughputHistory();
        const latency = throughputHistory.getAverageLatency(mediaType);
        const throughput = throughputHistory.getAverageThroughput(mediaType, isDynamic);
        const safeThroughput = throughputHistory.getSafeAverageThroughput(mediaType, isDynamic);

        const useBufferOccupancyABR = rulesContext.useBufferOccupancyABR();
        // const stableBufferTime = mediaPlayerModel.getStableBufferTime();

        const bitrateMap = mediaPlayerModel.getBitrateInfoListFor(mediaType);
        const minQuality = mediaPlayerModel.getMinAllowedBitrateFor(mediaType);
        const maxQuality = mediaPlayerModel.getMaxAllowedBitrateFor(mediaType);
        const prevBitrate = mediaPlayerModel.getQualityFor(mediaType);
        const bufferLevel = dashMetrics.getCurrentBufferLevel(metrics);
        const lowReservoir = 90;
        const cushion = 120; // and upper reservoir = 30 seconds

        if (!useBufferOccupancyABR || isNaN(throughput)) {
            return switchRequest;
        }

        const quality = BBA0(
            bitrateMap,
            minQuality,
            maxQuality,
            LINEAR_F,
            prevBitrate,
            bufferLevel,
            lowReservoir,
            cushion
        );

        switchRequest.quality = quality;

        return switchRequest;
    }

    function reset() {
        ;
    }

    const instance = {
        getMaxIndex: getMaxIndex,
        reset: reset
    };

    return instance;
}

BBARule.__dashjs_factory_name = 'BBARule';
export default FactoryMaker.getClassFactory(BBARule);
