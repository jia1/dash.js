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
const DEFAULT_CHUNK_DURATION = 4;
const IDEAL_BUFFER_LEN = 240;
const MIN_RESERVOIR_PERCENT = 8 / IDEAL_BUFFER_LEN;
const MAX_RESERVOIR_PERCENT = 140 / IDEAL_BUFFER_LEN;
const STEADY_THRESHOLD_PERCENT = 120 / IDEAL_BUFFER_LEN;
const DELTA_B_THRESHOLD = 0.875;

/*
    4.1 Algorithm 1: Video Rate Adaptation Algorithm

    BBA-0

    PARAMETERS
    rList       List of bitrates in ascending order
    rMin        Minimum bitrate
    rMax        Maximum bitrate
    f           Function which accepts a buffer level (seconds) and returns a bitrate
                Actual function signature: f(bufNow, r, cu, rMin, rMax)
    ratePrev    Previously used video rate
    bufNow      Current buffer occupancy
    r           Buffer lower reservoir size
    cu          Buffer cushion size

    LOCAL VARIABLES
    ratePlus    Next higher discrete video rate
    rateMinus   Next lower discrete video rate
    rateNext    Next video rate to use
    adjBuf      Adjusted buffer (i.e. f(B(t)))
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
    5. Handling Variable Bitrate (VBR)

    BBA-1

    ADDITIONAL PARAMETERS
    bufferLength    Actual buffer length (seconds)
    chunkDuration   Chunk duration (seconds)
    chunkQuality    Chunk duration (bps)
    V               Chunk quality (i.e. instantaneous video rate)
    X               Next X seconds for calculating reservoir

    LOCAL VARIABLES
    chunkPlus       The amount of buffer we need in order to avoid rebuffer
                    A.k.a. expected playback size for next X seconds
                    "Plus" because this is the amount we need to "plus" to the buffer
    chunkMinus      The amount of buffer we can resupply during this period
                    A.k.a. expected download size for next X seconds
                    "Minus" because this is the amount we need to "minus" from adding to the buffer
    lowReservoir    Buffer lower reservoir size
    chunkMap        List of expected chunk sizes for each bitrate
    chunkSizeMin    Expected chunk size for the minimum bitrate
    chunkSizeMax    Expected chunk size for the maximum bitrate
    chunkSizePrev   Expected chunk size for the previous bitrate
*/
const BBA1 = (rList, rMin, rMax, f, ratePrev, bufNow, bufferLength, cu, chunkDuration, chunkQuality, X) => {
    chunkDuration = chunkDuration || DEFAULT_CHUNK_DURATION;
    const minReservoir = MIN_RESERVOIR_PERCENT * bufferLength;
    const maxReservoir = MAX_RESERVOIR_PERCENT * bufferLength;

    // 5.1 Reservoir Calculation
    // TODO: Actual chunkPlus should be a summation of future chunk sizes
    // and not a simple multiplication. Where to get this information?
    const chunkPlus = chunkQuality * X;
    const chunkMinus = ratePrev * X;
    let lowReservoir = chunkPlus - chunkMinus;
    if (lowReservoir < minReservoir) {
        lowReservoir = minReservoir;
    } else if (lowReservoir > maxReservoir) {
        lowReservoir = maxReservoir;
    }

    // 5.2 Chunk Map
    // Translate bitrate (bps) to chunk size (b)
    const chunkMap = rList.map(bitrate => bitrate * chunkDuration);
    const chunkSizeMin = rMin * chunkDuration;
    const chunkSizeMax = rMax * chunkDuration;
    const chunkSizePrev = chunkQuality * chunkDuration;

    return BBA0(
        chunkMap,
        chunkSizeMin,
        chunkSizeMax,
        f,
        chunkSizePrev,
        bufNow,
        lowReservoir,
        cu
    ) / chunkDuration;
};

/*
    6. The Startup Phase

    BBA-2

    ADDITIONAL PARAMETERS
    currTime        Current time as seen in the player

    LOCAL VARIABLES
    isSteady        Whether current play time has passed startup phase
    chunkSize       Chunk size
    V               Chunk duration
    deltaB          Difference between buffer input rate and buffer output rate
*/
const BBA2 = (rList, rMin, rMax, f, ratePrev, bufNow, bufferLength, cu, chunkDuration, chunkQuality, X, currTime) => {
    // const isSteady = currTime > 120;
    const isSteady = currTime > Math.floor(STEADY_THRESHOLD_PERCENT * bufferLength);

    if (!isSteady) {
        const chunkSize = chunkQuality * chunkDuration;
        const ratePrevPlusOne = rList[rList.indexOf(ratePrev) + 1];
        const V = chunkDuration;
        const deltaB = V - chunkSize / (2 * ratePrevPlusOne);
        if (deltaB > V * DELTA_B_THRESHOLD) {
            if (ratePrev == rMax) {
                return rMax;
            } else {
                return ratePrevPlusOne;
            }
        }
    }
    // if isSteady || deltaB <= V * DELTA_B_THRESHOLD
    return BBA1(rList, rMin, rMax, f, ratePrev, bufNow, cu, chunkDuration, chunkQuality, X);
};

const BBAAlgorithm = {
    BBA0,
    BBA1,
    BBA2,
    IDEAL_BUFFER_LEN,
    LINEAR_F,
    PCWISE_F
};

export default BBAAlgorithm;
