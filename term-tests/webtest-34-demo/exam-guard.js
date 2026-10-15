globalThis.examGuardReducer = (state, event) => {
  const next = { ...state };
  const commands = [];
  if(event.type === 'device_superseded'){
    next.superseded = true;
    next.prompt = true;
    commands.push({ type: 'pause_audio' });
  }else if(state.superseded){
    return { state: next, commands };
  }
  if(event.type === 'left_exam'){
    if(!state.running) return { state: next, commands };
    const combined = state.incidentId && event.at - state.lastIncidentAt < 2000;
    if(!combined){
      if(state.incidentId) commands.push({ type: 'close_incident', incidentId: state.incidentId });
      next.incidentId = event.incidentId;
      commands.push({ type: 'open_incident', incidentId: event.incidentId });
    }
    next.lastIncidentAt = event.at;
    next.prompt = true;
    if(!state.prompt) commands.push({ type: 'pause_audio' });
  }else if(event.type === 'return_click' && state.prompt){
    if(state.fullscreenSupported) commands.push({ type: 'request_fullscreen' });
    if(state.incidentId) commands.push({ type: 'close_incident', incidentId: state.incidentId });
    commands.push({ type: 'resume_audio' });
    delete next.incidentId;
    delete next.lastIncidentAt;
    next.prompt = false;
  }
  return { state: next, commands };
};

globalThis.examDeviceRequestBody = (body, deviceId) => ({...body, deviceId});
