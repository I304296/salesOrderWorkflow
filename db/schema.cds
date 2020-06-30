namespace com.sap.orderprocess.app;
using { cuid } from '@sap/cds/common';

entity SalesOrderFlow: cuid{
    SOID: String;
    WFID: String;
    Status: String;
    System: String;
}