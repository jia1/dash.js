import SwitchRequest from '../SwitchRequest.js';
import FactoryMaker from '../../../core/FactoryMaker';
import EventBus from '../../../core/EventBus';
import Events from '../../../core/events/Events';
import {
    BUFFER_L,
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
    const eventBus = EventBus(context).getInstance();

    let instance;
    let state;

    function setup() {
        resetInitialSettings();
        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, instance);
    }

    /*
        Function signature and application copied from BolaRule.js
    */
    function onMediaFragmentLoaded(e) {
        if (e && e.chunk && e.chunk.mediaInfo) {
            state.chunk.duration = e.chunk.duration;
            state.chunk.quality = e.chunk.quality;
        }
    }

    /*
        Returns a switch request with the quality field containing the selected bitrate
    */
    function getMaxIndex(rulesContext) {
        const switchRequest = SwitchRequest(context).create();

        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaType();
        const metrics = metricsModel.getReadOnlyMetricsFor(mediaType);

        const streamInfo = rulesContext.getStreamInfo();
        const isDynamic = streamInfo && streamInfo.manifestInfo && streamInfo.manifestInfo.isDynamic;

        const abrController = rulesContext.getAbrController();
        const throughputHistory = abrController.getThroughputHistory();
        const throughput = throughputHistory.getAverageThroughput(mediaType, isDynamic);
        // const latency = throughputHistory.getAverageLatency(mediaType);
        const useBufferOccupancyABR = rulesContext.useBufferOccupancyABR();

        const bitrateList = abrController.getBitrateList(mediaInfo).map(x => x.bitrate / 1000);
        const minBitrate = bitrateList[0];
        const maxBitrate = bitrateList[bitrateList.length - 1];
        const prevBitrate = bitrateList[state.quality];
        const bufferLevel = dashMetrics.getCurrentBufferLevel(metrics);
        // mediaPlayerModel.getBufferLength is not a function
        const bufferLength = mediaPlayerModel.getBufferLength(mediaType);

        if (!useBufferOccupancyABR || isNaN(throughput)) {
            return switchRequest;
        }

        // Required by BBA-0 and above
        const lowerReservoirLength = Math.floor((90 / BUFFER_L) * bufferLength);
        const cushionLength = Math.floor((126 / BUFFER_L) * bufferLength);
        // and upper reservoir = 24 seconds

        // Required by BBA-1 and above
        const chunkDuration = state.chunk.duration || 4;
        const chunkQuality = state.chunk.quality || bitrateList[state.quality];
        const X = 2 * bufferLength;

        // Required by BBA-2 and above
        // TypeError: mediaPlayerModel.time is not a function
        const currTime = streamInfo ? mediaPlayerModel.time(streamInfo.id) : mediaPlayerModel.time();

        let newBitrate;
        // Can comment out unused BBA calls when linter is disabled
        newBitrate = BBA0(
            bitrateList,
            minBitrate,
            maxBitrate,
            PCWISE_F,
            prevBitrate,
            bufferLevel,
            lowerReservoirLength,
            cushionLength
        );

        newBitrate = BBA1(
            bitrateList,
            minBitrate,
            maxBitrate,
            PCWISE_F,
            prevBitrate,
            bufferLevel,
            bufferLength,
            cushionLength,  // lowerReservoirLength is dynamically assigned inside BBA1
            chunkDuration,
            chunkQuality,
            X               // Next X seconds for calculating reservoir
        );

        newBitrate = BBA2(
            bitrateList,
            minBitrate,
            maxBitrate,
            PCWISE_F,
            prevBitrate,
            bufferLevel,
            bufferLength,
            cushionLength,
            chunkDuration,
            chunkQuality,
            X,
            currTime
        );

        const quality = abrController.getQualityForBitrate(mediaInfo, newBitrate, 0);
        state.quality = quality;
        switchRequest.quality = quality;
        return switchRequest;
    }

    function resetInitialSettings() {
        // TODO: Where to configure buffer length?
        // state.quality    Previously selected quality (quality is an index in a bitrate list)
        // state.chunk      Latest loaded chunk
        state = {
            quality: 0,
            chunk: {
                duration: 0,
                quality: 0
            }
        };
    }

    function reset() {
        resetInitialSettings();
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, instance);
    }

    instance = {
        getMaxIndex: getMaxIndex,
        reset: reset
    };

    setup();
    return instance;
}

BBARule.__dashjs_factory_name = 'BBARule';
export default FactoryMaker.getClassFactory(BBARule);
