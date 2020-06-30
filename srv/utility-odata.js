// ========
// ODATA UTILS
// Author: Dan
// ========
module.exports = {
    createQueryParams: function(req, sEntityName){
        let oParam = {
            skip: 0,
            top: 1000,
            filter: null
        };

        var sQuery = "";

        // Check for $count request
        if (req.query.SELECT.columns[0].func === "count"){
            // Filters
            if (req._.query && req._.query.$filter){
                oParam.filter = req._.query.$filter;
            }

            //Build Query
            sQuery = sEntityName +  "/$count"
                + (oParam.filter ? '?$filter=' + oParam.filter : '');
            return sQuery;
        }
        else{
            // Paging
            if (req.query.SELECT.limit){
                oParam.skip = req.query.SELECT.limit.offset ? req.query.SELECT.limit.offset.val : oParam.skip;
                oParam.top = req.query.SELECT.limit.rows ? req.query.SELECT.limit.rows.val : oParam.top;
            }

            // Filters
            if (req._.query && req._.query.$filter){
                oParam.filter = req._.query.$filter;
            }

            // Build Query
            sQuery = sEntityName 
                + "?$top=" + oParam.top + "&$skip=" + oParam.skip 
                + (oParam.filter ? '&$filter=' + oParam.filter : '');
            return sQuery;
        }
    },

    formatResponse: function(sQuery, oResponse){
        if (sQuery.indexOf("$count")> -1){
            return { counted: oResponse } 
        } else {
            return oResponse
        }
    }
};