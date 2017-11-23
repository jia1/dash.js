/*
    GLOBAL VARIABLES
*/
const LINEAR_F = (bufNow, r, cu, rMin, rMax) => rMin + bufNow * (rMax - rMin);
const PCWISE_F = (bufNow, r, cu, rMin, rMax) => {
    if (bufNow <= r) {
        return rMin;
    } else if (bufNow <= r + cu) {
        return rMin + (bufNow - r) * (rMax - rMin);
    } else {
        return rMax;
    }
};

/*
    4.1 Algorithm 1: Video Rate Adaptation Algorithm

    PARAMETERS
    ratePrev  Previously used video rate
    bufNow    Current buffer occupancy
    r         (LOW) Buffer reservoir size
    cu        (MED) Buffer cushion size

    LOCAL VARIABLES
    ratePlus  Next higher discrete video rate
    rateMinus Next lower discrete video rate
    rateNext  Next video rate to use
    adjBuf    Adjusted buffer (i.e. f(B(t)))
*/
const BBA0 = (rList, rMin, rMax, f, ratePrev, bufNow, r, cu) => {
    let ratePlus;
    let rateMinus;
    let rateNext;

    if (ratePrev == rMax) {
        ratePlus = rMax;
    } else {
        // ratePlus = min{r : r > ratePrev}
        ratePlus = rMax;
        for (let i = rList.length - 1; i >= 0; i++) {
            if (rList[i] > ratePrev && rList[i] < ratePlus) {
                ratePlus = rList[i];
            }
        }
    }

    if (ratePrev == rMin) {
        rateMinus = rMin;
    } else {
        // rateMinus = max{r : r < ratePrev}
        rateMinus = rMin;
        for (let i = 0; i < rList.length; i++) {
            if (rList[i] < ratePrev && rList[i] > rateMinus) {
                rateMinus = rList[i];
            }
        }
    }

    if (bufNow <= r) {
        rateNext = rMin;
    } else if (bufNow >= r + cu) {
        rateNext = rMax;
    } else {
        const adjBuf = f(bufNow, r, cu, rMin, rMax);
        if (adjBuf >= ratePlus) {
            // rateNext = max{r : r < adjBuf}
            rateNext = rMin;
            for (let i = 0; i < rList.length; i++) {
                if (rList[i] < adjBuf && rList[i] > rateNext) {
                    rateNext = rList[i];
                }
            }
        } else if (adjBuf <= rateMinus) {
            // rateNext = min{r : r > adjBuf}
            rateNext = rMax;
            for (let i = rList.length - 1; i >= 0; i++) {
                if (rList[i] > adjBuf && rList[i] < rateNext) {
                    rateNext = rList[i];
                }
            }
        } else {
            rateNext = ratePrev;
        }
    }

    return rateNext;
};

/*
    5. HANDLING VARIABLE BITRATE (VBR)

    V            Chunk time (seconds)
    X            Next X seconds for calculating reservoir
    playbackRate Current playback rate
*/
const BBA1 = (rList, rMin, rMax, f, ratePrev, bufNow, cu, V, X, playbackRate) => {
    const minReservoir = 8;
    const maxReservoir = 140;

    // 5.1 Reservoir Calculation
    // chunkPlus  The amount of buffer we need in order to avoid rebuffer
    // chunkMinus The amount of buffer we can resupply during this period
    // TODO: Are chunkPlus and chunkMinus correct?
    const chunkPlus = playbackRate * X;
    const chunkMinus = ratePrev * X;
    let lowReservoir = chunkPlus - chunkMinus;
    if (lowReservoir < minReservoir) {
        lowReservoir = minReservoir;
    } else if (lowReservoir > maxReservoir) {
        lowReservoir = maxReservoir;
    }

    // 5.2 Chunk Map
    const chunkMap = rList.map(bitrate => bitrate * V);
    const chunkSizeMin = rMin * V;
    const chunkSizeMax = rMax * V;
    const chunkSizePrev = ratePrev * V;

    return BBA0(
        chunkMap,
        chunkSizeMin,
        chunkSizeMax,
        f,
        chunkSizePrev,
        bufNow,
        lowReservoir,
        cu
    ) / V; // chunkTime
};

/*
    6. THE STARTUP PHASE

    currTime Current time as seen in the player
*/
const BBA2 = (rList, rMin, rMax, f, ratePrev, bufNow, cu, V, X, playbackRate, currTime) => {
    const isSteady = currTime > 120;

    if (isSteady) {
        return BBA1(rList, rMin, rMax, f, ratePrev, bufNow, cu, V, X, playbackRate);
    } else {
        // TODO: chunkSize looks wrong
        const chunkSize = ratePrev * V;
        const deltaB = V - chunkSize / ratePrev; // playback - download
        if (deltaB > 0.875 * V) {
            if (ratePrev == rMax) {
                return rMax;
            } else {
                return rList[rList.indexOf(ratePrev) + 1];
            }
        } else {
            return BBA1(rList, rMin, rMax, f, ratePrev, bufNow, cu, V, X, playbackRate);
        }
    }
};

const BBAAlgorithm = {
    BBA0,
    BBA1,
    BBA2,
    LINEAR_F,
    PCWISE_F
};

export default BBAAlgorithm;
