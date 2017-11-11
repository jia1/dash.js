# My Questions

### What is the `config` parameter?
```
function BBARule(config) {
  ...
}
```

### What is `context`?
```
function BBARule(config) {
  const context = this.context;
  ...
}
```

### Is `useBufferOccupancyABR` referring to whether the buffer is being used?
```
const useBufferOccupancyABR = rulesContext.useBufferOccupancyABR();
```

### What does `getMaxIndex` mean? I know it has to return a `SwitchRequest`.
```
function getMaxIndex(rulesContext) {
  ...
}
```

### Can I assume `getBitrateInfoListFor(type)` returns an array of bitrates in ascending order? Most likely yes.
```
const bitrateMap = mediaPlayerModel.getBitrateInfoListFor(mediaType);
```

### Should switchRequest.quality be an index in a bitrate list or the actual bitrate?
```
switchRequest.quality = quality;
```
