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

### <s>What does `getMaxIndex` mean? I know it has to return a `SwitchRequest`.</s>
```
function getMaxIndex(rulesContext) {
  ...
}

Answer: Just return a SwitchRequest with the "quality" field.
```

### Can I assume `getBitrateInfoListFor(type)` returns an array of bitrates in ascending order? Most likely yes.
```
const bitrateMap = mediaPlayerModel.getBitrateInfoListFor(mediaType);
```

### <s>Should `switchRequest.quality` be an index in a bitrate list or the actual bitrate?</s>
```
switchRequest.quality = quality;

Answer: Index in a bitrate list.
```

# How often is `getMaxIndex` called? After every 1 chunk or x chunks?
