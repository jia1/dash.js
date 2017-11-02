import FactoryMaker from '../../../core/FactoryMaker';
import Debug from '../../../core/Debug';
import SwitchRequest from '../SwitchRequest.js';

function BBARule(config) {

    const context = this.context;
    const log = Debug(context).getInstance().log;

    const dashMetrics = config.dashMetrics;
    const metricsModel = config.metricsModel;
    const mediaPlayerModel = config.mediaPlayerModel;

    function getMaxIndex(rulesContext) {
        const switchRequest = SwitchRequest(context).create();
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
