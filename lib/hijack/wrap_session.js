var Fibers = Npm.require('fibers');

wrapSession = function(sessionProto) {

  var originalProcessMessage = sessionProto.processMessage;
  sessionProto.processMessage = function(msg) {
    var apmInfo = {
      session: this.id,
      userId: this.userId
    };

    if(msg.msg == 'method') {
      apmInfo.method = {
        name: msg.method,
        id: msg.id
      };
      msg.__apmInfo = apmInfo;

      console.log('==================================');
      NotificationManager.methodTrackEvent('start', null, apmInfo);
      NotificationManager.methodTrackEvent('wait', null, apmInfo);
    }

    return originalProcessMessage.call(this, msg);
  };

  //adding the method context to the current fiber
  var originalMethodHandler = sessionProto.protocol_handlers.method;
  sessionProto.protocol_handlers.method = function(msg, unblock) {
    //add context
    Fibers.current.__apmInfo = msg.__apmInfo;

    NotificationManager.methodTrackEvent('waitend');

    return originalMethodHandler.call(this, msg, unblock);
  };

  //track method ending (to get the result of error)
  var originalSend = sessionProto.send;
  sessionProto.send = function(msg) {
    if(msg.msg == 'result') {
      if(msg.error) {
        NotificationManager.methodTrackEvent('error', {error: msg.error});
      } else if(msg.result) {
        NotificationManager.methodTrackEvent('complete');
      }
    }

    return originalSend.call(this, msg);
  };
};