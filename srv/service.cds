using { com.sap.orderprocess.app as app } from '../db/schema';

service OrderWorkflowService{
    entity SOFlow as projection on app.SalesOrderFlow;
}