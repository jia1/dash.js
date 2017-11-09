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

    function getMaxIndex(rulesContext) {
        const switchRequest = SwitchRequest(context).create();

        let bufferLevel = dashMetrics.getCurrentBufferLevel(metrics);
        const metrics = metricsModel.getReadOnlyMetricsFor(mediaType);

        const mediaInfo = rulesContext.getMediaInfo();
        const bitrateList = mediaInfo.bitrateList.map(b => b.bandwidth);

        const mediaType = rulesContext.getMediaType();

        const streamInfo = rulesContext.getStreamInfo();
        const streamId = streamInfo ? streamInfo.id : null;
        const isDynamic = streamInfo && streamInfo.manifestInfo && streamInfo.manifestInfo.isDynamic;

        const useBufferOccupancyABR = rulesContext.useBufferOccupancyABR();

        const abrController = rulesContext.getAbrController();
        const throughputHistory = abrController.getThroughputHistory();
        let latency = throughputHistory.getAverageLatency(mediaType);
        let safeThroughput = throughputHistory.getSafeAverageThroughput(mediaType, isDynamic);
        let throughput = throughputHistory.getAverageThroughput(mediaType, isDynamic);
        let quality;

        switchRequest.reason = switchRequest.reason || {};
        switchRequest.reason.latency = latency;
        switchRequest.reason.throughput = throughput;

        // abrController.getTopQualityIndexFor(mediaType, streamId)

        if (!useBufferOccupancyABR) {
            return switchRequest;
        }

        if (isNaN(throughput)) {
            return switchRequest;
        }

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
