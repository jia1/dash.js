/*
  GLOBAL VARIABLES
  rMax      Max video rate available
  rMin      Min video rate available
  f         Function
*/

// Dummy definitions and values
// const rList = [rMin, rMax];
// const rMax = 0;
// const rMin = 0;
// const f = (bufNow) => rMin;

/*
  PARAMETERS
  ratePrev  Previously used video rate
  bufNow    Current buffer occupancy
  r         (LOW) Buffer reservoir size
  cu        (MED) Buffer cushion size

  LOCAL VARIABLES
  ratePlu   Next higher discrete video rate
  rateMinus Next lower discrete video rate
  rateNext  Next video rate to use
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
  } else if (f(bufNow) >= ratePlus) {
    // rateNext = max{r : r < f(bufNow)}
    rateNext = rMin;
    for (let i = 0; i < rList.length; i++) {
      if (rList[i] < f(bufNow) && rList[i] > rateNext) {
        rateNext = rList[i];
      }
    }
  } else if (f(bufNow) <= rateMinus) {
    // rateNext = min{r : r > f(bufNow)}
    rateNext = rMax;
    for (let i = rList.length - 1; i >= 0; i++) {
      if (rList[i] > f(bufNow) && rList[i] < rateNext) {
        rateNext = rList[i];
      }
    }
  } else {
    rateNext = ratePrev;
  }

  return rateNext;
}

const BBAAlgorithm = {
  BBA0
};

export default BBAAlgorithm;
