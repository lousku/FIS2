/*global require,console,setTimeout */
var opcua = require("node-opcua");
var async = require("async");

var client = new opcua.OPCUAClient();
//this need to be the Uri of the server
var endpointUrl = "opc.tcp://TREKT182.EATECH.LOCAL:3003/MyLittleServer";

var the_session, the_subscription;

var omaNode;

async.series([

    // step 1 : connect to
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

    // step 3 : browse
    function(callback) {
       the_session.browse("RootFolder", function(err,browseResult){
           if(!err) {
               browseResult.references.forEach(function(reference) {
                   console.log( reference.browseName.toString());
                   console.log("REFERENCE!" + reference);
                   console.log("NODECLASSS: " + reference.nodeClass);
                   omaNode = reference.nodeClass;
               });
               console.log("browse onnistu");
           }
           callback(err);
       });
    },

    // step 4 : read a variable with readVariableValue
    function(callback) {
       the_session.readVariableValue("ns=1;s=water_level", function(err,dataValue) {
           if (!err) {
               console.log(" free mem % = " , dataValue.toString());
           }
           callback(err);
       });


    },

    // step 4' : read a variable with read
    function(callback) {
       var maxAge = 0;
       var nodeToRead = { nodeId: "ns=1;s=water_level", attributeId: opcua.AttributeIds.Value };
       the_session.read(nodeToRead, maxAge, function(err,dataValue) {
           if (!err) {
               console.log(" free mem % = " , dataValue.toString() );
           }
           callback(err);
       });


    },
     //try to write to variable
    function(callback) {
      var nodetobrowse;
      var browsePath = [
          opcua.makeBrowsePath("RootFolder", "/Objects"),
      ];
        console.log("browseBAth: " + browsePath);

        the_session.browse("ns=1;i=1000", function (err, itemResults,diagnostics) {
            if (!err) {
              console.log("TULOS" + itemResults);
              console.log("JOO" + diagnostics);
            //  nodetobrowse = results.targets.targetId;
            //  console.log("TARGETTI!!!" + nodetobrowse );
            //  productNameNodeId = results[0].targets[0].targetId;
            }
        });




            let Tank_startExp_methodToCalls = [{
       objectId: "ns=1;i=1000",
       methodId: "ns=1;i=1003",
    //   inputArguments: [{dataType: DataType.Int64, value: value}]
   }];

       the_session.call(Tank_startExp_methodToCalls, function(err,results) {
           if (!err) {
               console.log(" method ok" );
               console.log(results);
           }
           console.log("kirjottamisessa virhe")
           callback(err);
       });


    },

    // step 5: install a subscription and install a monitored item for 10 seconds
    function(callback) {

       the_subscription=new opcua.ClientSubscription(the_session,{
           requestedPublishingInterval: 1000,
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
       },10000);

       // install monitored item
       var monitoredItem  = the_subscription.monitor({
           nodeId: opcua.resolveNodeId("ns=1;s=water_level"),
           attributeId: opcua.AttributeIds.Value
       },
       {
           samplingInterval: 100,
           discardOldest: true,
           queueSize: 10
       },
       opcua.read_service.TimestampsToReturn.Both
       );
       console.log("-------------------------------------");

       monitoredItem.on("changed",function(dataValue){
          console.log(" % free mem = ",dataValue.value.value);
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
