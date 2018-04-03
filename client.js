/*global require,console,setTimeout */
var opcua = require("node-opcua");
var async = require("async");

var client = new opcua.OPCUAClient();
//this need to be the Uri of the server
var endpointUrl = "opc.tcp://dyn-159-234.public.tut.fi:3003/MyLittleServer";

var the_session, the_subscription;

var omaNode;

async.series([

    // step 1 : connect to server
    function(callback)  {
        client.connect(endpointUrl,function (err) {
            if(err) {
                console.log(" cannot connect to endpoint :" , endpointUrl );
            } else {
                console.log("connected !");
            }
            callback(err);
        });
    },

    // step 2 : createSession
    function(callback) {
        client.createSession( function(err,session) {
            if(!err) {
                the_session = session;
            }
            console.log("sessio luotu");
            callback(err);
        });
    },

    //Experiment start
    function(callback) {
        let Tank_startExp_methodToCalls = [{
          objectId: "ns=1;i=1000",
          methodId: "ns=1;i=1003",
   }];
       the_session.call(Tank_startExp_methodToCalls, function(err,results) {
           if (!err) {
               console.log("Start experiment Method OK" );
               console.log(results);
           }
           else {
               console.log("Start experiment Method FAILED!" )
           }
           callback(err);
       });
    },

    // step 5: install a subscription and install a monitored item for 10 seconds
    function(callback) {

       the_subscription=new opcua.ClientSubscription(the_session,{
           requestedPublishingInterval: 10,
           requestedLifetimeCount: 10,
           requestedMaxKeepAliveCount: 1,
           maxNotificationsPerPublish: 10,
           publishingEnabled: true,
           priority: 10
       });

       the_subscription.on("started",function(){
           console.log("subscription started for 2 seconds - subscriptionId=",the_subscription.subscriptionId);
       }).on("keepalive",function(){
           console.log("keepalive");
       }).on("terminated",function(){
       });

       setTimeout(function(){
           the_subscription.terminate(callback);
       },100000);

       // install monitored item
       var monitoredItem  = the_subscription.monitor({
           nodeId: opcua.resolveNodeId("ns=1;s=water_level"),
           attributeId: opcua.AttributeIds.Value
       },
       {
           samplingInterval: 10,
           discardOldest: true,
           queueSize: 10
       },
       opcua.read_service.TimestampsToReturn.Both
       );
       console.log("-------------------------------------");

       //Main Loop
       monitoredItem.on("changed",function(dataValue){
          console.log(" Tank Level = ",dataValue.value.value);
          if(dataValue.value.value >= 6.5){
            set_valve(the_session,1);
          }
          else{
            set_valve(the_session,0.5);
          }

       });
    },

    // close session
    function(callback) {
        the_session.close(function(err){
            if(err) {
                console.log("session closed failed ?");
            }
            callback();
        });
    }

],
function(err) {
    if (err) {
        console.log(" failure ",err);
    } else {
        console.log("done!");
    }
    client.disconnect(function(){});
}) ;

//Setting valve position
function set_valve(session, input_value) {
    let Valve_methodToCalls = [{
      objectId: "ns=1;i=1000",
      methodId: "ns=1;i=1001",
      inputArguments: [{dataType: opcua.DataType.Float, value: input_value}]
}];
   session.call(Valve_methodToCalls, function(err,results) {
       if (!err) {
           console.log("Set valve method OK" );
           //console.log(results);
       }
       else {
            console.log("Set valve method FAIL");
       }
   });
}
