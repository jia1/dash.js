import FactoryMaker from '../../../core/FactoryMaker';
import Debug from '../../../core/Debug';
import SwitchRequest from '../SwitchRequest.js';
import { PCWISE_F, BBA0 } from './BBAAlgorithm';

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

        const bitrateList = mediaPlayerModel.getBitrateInfoListFor(mediaType);
        const minQuality = mediaPlayerModel.getMinAllowedBitrateFor(mediaType);
        const maxQuality = mediaPlayerModel.getMaxAllowedBitrateFor(mediaType);
        const prevBitrate = bitrateList[mediaPlayerModel.getQualityFor(mediaType)];
        const bufferLevel = dashMetrics.getCurrentBufferLevel(metrics);

        if (!useBufferOccupancyABR || isNaN(throughput)) {
            return switchRequest;
        }

        const lowReservoir = 90;
        const cushion = 120; // and upper reservoir = 30 seconds
        const quality = BBA0(
            bitrateList,
            minQuality,
            maxQuality,
            PCWISE_F,
            prevBitrate,
            bufferLevel,
            lowReservoir,
            cushion
        );

        /*
        const V = 4;  // chunkTime (seconds)
        const X = 90; // Next X seconds for calculating reservoir
        const playbackRate = mediaPlayerModel.getPlaybackRate();
        const quality = BBA1(
            bitrateList,
            minQuality,
            maxQuality,
            PCWISE_F,
            prevBitrate,
            bufferLevel,
            cushion, // lowReservoir is dynamically assigned inside BBA1
            V,
            X,
            playbackRate
        );
        */

        /*
        const V = 4;  // chunkTime (seconds)
        const X = 90; // Next X seconds for calculating reservoir
        const playbackRate = mediaPlayerModel.getPlaybackRate();
        const currTime = streamInfo ? mediaPlayerModel.time(streamInfo.id) : mediaPlayerModel.time();
        const quality = BBA2(
            bitrateList,
            minQuality,
            maxQuality,
            PCWISE_F,
            prevBitrate,
            bufferLevel,
            cushion, // lowReservoir is dynamically assigned inside BBA1
            V,
            X,
            playbackRate,
            currTime
        );
        */

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
