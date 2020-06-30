const cds = require('@sap/cds');
const restclient = require('./rest-client')

module.exports = cds.service.impl((srv) => {

    const { SOFlow } = srv.entities;
    //SalesOrder
    srv.on('SCPNAPra/IntSCPEM/ZMAEM/BO/SalesOrder/Created', async (msg) => {
        const messagePayload = JSON.stringify(msg);
        console.log('===> Received message : ' + messagePayload);

        let salesOrder = {};

        if (msg.headers.EVENT_PAYLOAD) {
            salesOrder = msg.headers.EVENT_PAYLOAD.KEY[0].SALESORDER;
        } else {
            salesOrder = msg.data.KEY[0].SALESORDER;
        }
        const SOnumber = parseInt(salesOrder, 10).toString();
        const SOraw = salesOrder.toString();

        console.log('===> Received SO : ' + salesOrder);
        console.log(`===> Received SO : ${SOnumber}`);
        console.log(`===> Req : ${JSON.stringify(msg)}`);

        const tx = cds.transaction(msg);
        //console.log('===> Txn : ' + JSON.stringify(tx));
        //console.log('===> entity : ' + JSON.stringify(SOFlow));

        //Update SO WF Status
        await tx.run(UPDATE(SOFlow).set({
            STATUS: "Created"
        }).where('SOID =', SOnumber));

        //Get SO WF data
        //const so = await tx.run(SELECT.from (SOFlow).where ({ SOID:SOnumber })); 
        const so = await tx.run(SELECT.from(SOFlow).where('SOID =', SOnumber));
        console.log('===> Updated SO : ' + so.Status);

        const so2 = await tx.run(SELECT.one(SOFlow));
        console.log('===> SO one : ' + JSON.stringify(so2));

        console.log('===> SOnumber : ' + SOnumber);
        const select = SELECT.from(SOFlow).where({ SOID: SOnumber });
        console.log('===> Select : ' + select);
        const so1 = await tx.run(select);
        console.log('===> SO try 1 : ' + JSON.stringify(so1));

        console.log('===> SOraw : ' + SOraw);
        const so3 = await tx.run(SELECT.from('SOFlow').where({ SOID: SOraw }));
        console.log('===> SO try 2 : ' + JSON.stringify(so3));

        }),

        //Sales Order change
        srv.on('SCPNAPra/IntSCPEM/ZMAEM/BO/SalesOrder/Changed', async (msg) => {
            //Get SO No from EM message
            const salesOrder = _getSalesOrderNumber(msg);
            //Get Workflow ID for the SO
            const WFinstances = await _getWFIDviaREST(msg, salesOrder.number);
            console.log('===> Workflow ID : ' + JSON.stringify(WFinstances));
            //Update Workflow
            var WFID;
            for (var i = 0; i < WFinstances.length; i++) {
                WFID = WFinstances[i].WFID;
                const resp = await _updateWorkflowSOStatus(msg, WFID);
                console.log('===> Workflow Response : ' + JSON.stringify(resp));

            }

        }),

        //Outbound Delivery
        srv.on('SCPNAPra/IntSCPEM/ZMAEM/BO/OutboundDelivery/Created', async (msg) => {

            //Get Delivery No from EM message
            const delvNumber = _getDeliveryNo(msg);
            console.log('===> O/b delivery parsed: ' + delvNumber);
            //Get SO for the delivery
            const deliveryDocument = await _getDeliveryInfo(msg, delvNumber);
            console.log('===> Returned Message : ' + JSON.stringify(deliveryDocument));
            //Get Workflow ID for the SO
            const WFinstances = await _getWFIDviaREST(msg, deliveryDocument.ReferenceSDDocument);
            console.log('===> Workflow ID : ' + JSON.stringify(WFinstances));
            //Update Workflow
            var WFID;
            for (var i = 0; i < WFinstances.length; i++) {
                if (WFinstances[i].System === 'Cloud') {
                    WFID = WFinstances[i].WFID;
                }
            }
            const resp = await _updateWorkflowStatus(msg, WFID);
            console.log('===> Workflow Response : ' + JSON.stringify(resp));

        })

})
async function _getDeliveryInfo(msg, delvNumber) {
    const srvDeliveryCloud = cds.connect.to('API_OUTBOUND_DELIVERY_SRV');
    const baseURL = "/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV;v=0002/";
    const tx = srvDeliveryCloud.transaction(msg);
    const sQuery = baseURL + "A_OutbDeliveryItem(DeliveryDocument='" + delvNumber + "',DeliveryDocumentItem='000010')?$select=ReferenceSDDocument, DeliveryDocument";
    console.log('===> Query : ' + sQuery);
    var response = await tx.get(sQuery);
    console.log('===> Returned Message : ' + JSON.stringify(response));
    return response;
}

function _getDeliveryNo(msg) {
    const messagePayload = JSON.stringify(msg);
    console.log('===> Received message : ' + messagePayload);
    const delivery = msg.data.KEY[0].OUTBOUNDDELIVERY;
    console.log('===> O/b delivery : ' + delivery);
    let delvNumber = parseInt(delivery, 10).toString();
    console.log('===> O/b delivery Trimmed: ' + delvNumber);
    return delvNumber;
}

async function _getWFIDviaREST(msg, ReferenceSDDocument) {
    const SOID = ReferenceSDDocument;
    const srvSOWF = cds.connect.to('API_SALESORDER_WORKFLOW_SRV');
    const baseURL = "/order-workflow/";
    const tx = srvSOWF.transaction(msg);
    const sQuery = baseURL + "SOFlow?$select=WFID,SOID,System&$filter=SOID eq '" + SOID + "'";
    console.log('===> Query : ' + sQuery);
    var response = await tx.get(sQuery);
    console.log('===> Returned Message : ' + JSON.stringify(response));
    return response;
}

async function _updateWorkflowStatus(msg, WFID) {
    const workflowID = WFID;
    //const srvSOWF = cds.connect.to('API_WORKFLOW');
    //const baseURL = "/workflow-service/rest/v1/";
    //const tx = srvSOWF.transaction(msg);
    //const sQuery = baseURL + "messages/";
    const payload = {
        "context": {},
        "definitionId": "ProductIsDelivered",
        "workflowDefinitionId": "SalesOrderWorkflow",
        "businessKey": workflowID
    }
    const destination = {
        "xsuaaServiceInstance": "com-sap-salesorder-xsuaa",
        "destServiceInstance": "s4dest",
        "name": "Workflow"
    }
    //var response = await tx.post(sQuery).entries(payload);  
    //var response = await tx.insert(payload).into(sQuery);  
    const response = restclient.handlePOSTcall(msg, destination, payload);
    return response;
}

async function _updateWorkflowSOStatus(msg, WFID) {
    const workflowID = WFID;

    const payload = {
        "context": {},
        "definitionId": "SaleOrderProcessed",
        "workflowDefinitionId": "SalesOrderWorkflow",
        "businessKey": workflowID
    }
    console.log('==>SO Change WF payload'+ payload);
    const destination = {
        "xsuaaServiceInstance": "com-sap-salesorder-xsuaa",
        "destServiceInstance": "s4dest",
        "name": "Workflow"
    }

    const response = restclient.handlePOSTcall(msg, destination, payload);
    return response;
}

function _getSalesOrderNumber(msg) {
    const messagePayload = JSON.stringify(msg);
    console.log('===> Received message : ' + messagePayload);

    let salesOrder = {};

    if (msg.headers.EVENT_PAYLOAD) {
        salesOrder.number = msg.headers.EVENT_PAYLOAD.KEY[0].SALESORDER;
        salesOrder.system = "OnPremise";
    } else {
        salesOrder.number = msg.data.KEY[0].SALESORDER;
        salesOrder.system = "Cloud";
    }
    salesOrder.number = parseInt(salesOrder.number, 10).toString();
    return salesOrder;
}