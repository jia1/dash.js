import SwitchRequest from '../SwitchRequest.js';
import FactoryMaker from '../../../core/FactoryMaker';
import EventBus from '../../../core/EventBus';
import Events from '../../../core/events/Events';
import {
    PCWISE_F,
    BBA0,
    BBA1,
    BBA2
} from './BBAAlgorithm';

function BBARule(config) {

    const context = this.context;

    const dashMetrics = config.dashMetrics;
    const metricsModel = config.metricsModel;
    const mediaPlayerModel = config.mediaPlayerModel;

    let state;

    function setup() {
        resetInitialSettings();
        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, instance);
    }

    function onMediaFragmentLoaded(e) {
        if (e && e.chunk && e.chunk.mediaInfo) {
            state.chunk.duration = e.chunk.duration;
            state.chunk.quality = e.chunk.quality;
        }
    }

    function getMaxIndex(rulesContext) {
        const switchRequest = SwitchRequest(context).create();

        const mediaType = rulesContext.getMediaType();
        const metrics = metricsModel.getReadOnlyMetricsFor(mediaType);

        const streamInfo = rulesContext.getStreamInfo();
        const isDynamic = streamInfo && streamInfo.manifestInfo && streamInfo.manifestInfo.isDynamic;

        const abrController = rulesContext.getAbrController();
        const throughputHistory = abrController.getThroughputHistory();
        // const latency = throughputHistory.getAverageLatency(mediaType);
        const throughput = throughputHistory.getAverageThroughput(mediaType, isDynamic);
        // const safeThroughput = throughputHistory.getSafeAverageThroughput(mediaType, isDynamic);

        const useBufferOccupancyABR = rulesContext.useBufferOccupancyABR();

        /*
            Many different ways to get bitrate list
        */
        // const bitrateList = mediaPlayerModel.getBitrateInfoListFor(mediaType);
        const mediaInfo = rulesContext.getMediaInfo();
        const bitrateList = abrController.getBitrateList(mediaInfo);
        // const bitrateList = mediaInfo.bitrateList.map(b => b.bandwidth);

        const minQuality = mediaPlayerModel.getMinAllowedBitrateFor(mediaType);
        const maxQuality = mediaPlayerModel.getMaxAllowedBitrateFor(mediaType);

        /*
            Retrieve previous bitrate from state object
        */
        // const prevBitrate = bitrateList[mediaPlayerModel.getQualityFor(mediaType)];
        const prevBitrate = state.quality;

        const bufferLevel = dashMetrics.getCurrentBufferLevel(metrics);

        if (!useBufferOccupancyABR || isNaN(throughput)) {
            return switchRequest;
        }

        // Required by BBA-0 and above
        const lowReservoir = 90;
        const cushion = 126;
        // and upper reservoir = 24 seconds
        // TODO: Where to set max buffer level?

        // Required by BBA-1 and above
        const chunkDuration = state.chunk.duration || 4;
        const V = state.chunk.quality || mediaPlayerModel.getPlaybackRate();
        const X = 480;

        // Required by BBA-2 and above
        const currTime = streamInfo ? mediaPlayerModel.time(streamInfo.id) : mediaPlayerModel.time();

        let quality;

        quality = bitrateList.indexOf(BBA0(
            bitrateList,
            minQuality,
            maxQuality,
            PCWISE_F,
            prevBitrate,
            bufferLevel,
            lowReservoir,
            cushion
        ));

        quality = bitrateList.indexOf(BBA1(
            bitrateList,
            minQuality,
            maxQuality,
            PCWISE_F,
            prevBitrate,
            bufferLevel,
            cushion,        // lowReservoir is dynamically assigned inside BBA1
            chunkDuration,
            V,              // Instantaneous video bitrate
            X               // Next X seconds for calculating reservoir
        ));

        quality = bitrateList.indexOf(BBA2(
            bitrateList,
            minQuality,
            maxQuality,
            PCWISE_F,
            prevBitrate,
            bufferLevel,
            cushion,
            V,
            X,
            playbackRate,
            currTime
        ));

        switchRequest.quality = quality;
        state = { quality };

        return switchRequest;
    }

    function resetInitialSettings() {
        state = {
            quality: 0
        };
    }

    function reset() {
        resetInitialSettings();
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, instance);
    }

    const instance = {
        getMaxIndex: getMaxIndex,
        reset: reset
    };

    setup();
    return instance;
}

BBARule.__dashjs_factory_name = 'BBARule';
export default FactoryMaker.getClassFactory(BBARule);
