const axios = require('axios');
const request = require('request');
const cfenv = require('cfenv');

module.exports = {
    handlePOSTcall: function (req, destination, payload) {

        let config = {};

        /*********************************************************************
        *************** Step 1: Read the environment variables ***************
        *********************************************************************/
        const uaa_service = cfenv.getAppEnv().getService(destination.xsuaaServiceInstance); //com-sap-salesorder-xsuaa
        const dest_service = cfenv.getAppEnv().getService(destination.destServiceInstance); //s4dest
        const sUaaCredentials = dest_service.credentials.clientid + ':' + dest_service.credentials.clientsecret;
        console.log(`1.1.sUaaCredentials:${JSON.stringify(sUaaCredentials)}`);

        const sDestinationName = destination.name; //Workflow

        /*********************************************************************
        **** Step 2: Request a JWT token to access the destination service ***
        *********************************************************************/
        console.log(`2.Preparing POST to get oAuth token`);
        const post_options = {
            url: uaa_service.credentials.url + '/oauth/token', //'https://c0f03a16trial.authentication.eu10.hana.ondemand.com/oauth/token',
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(sUaaCredentials).toString('base64'),
                'Content-type': 'application/x-www-form-urlencoded'
            },
            form: {
                'client_id': dest_service.credentials.clientid,
                'grant_type': 'client_credentials'
            }
        }
        console.log(`2.1.Call POST: to get oAuth token`);
        request(post_options, (err, res, data) => {
            if (res.statusCode === 200) {

                /*************************************************************
                 *** Step 3: Search your destination in the destination service ***
                *************************************************************/
                console.log(`3.data:${JSON.stringify(data)}`);
                const token = JSON.parse(data).access_token;
                config.token = token;
                console.log(`4.token:${token}`);
                console.log(`5.dest. url:${dest_service.credentials.uri}`);
                console.log(`6.1.Prepare GET: to get destination config`);
                const get_options = {
                    url: dest_service.credentials.uri + '/destination-configuration/v1/destinations/' + sDestinationName,
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                }

                request(get_options, (err, res, data) => {

                    /*********************************************************
                     ********* Step 4: Access the destination securely *******
                    *********************************************************/
                    console.log(`6.2.Call GET: to get destination config`);
                    const oDestination = JSON.parse(data);
                    console.log(`6.3.Destination Config:${JSON.stringify(oDestination.destinationConfiguration)}`);
                    config.destConfig = oDestination.destinationConfiguration;
                    const url = config.destConfig.URL;
                    console.log(`7.1.URL:${url}`);
                    const token = config.token;
                    console.log(`7.2.Token:${token}`);
                    const WFurl = oDestination.destinationConfiguration.URL;
                    console.log('==>WFurl:'+ WFurl);
                    const WFtokenServiceURL = oDestination.destinationConfiguration.tokenServiceURL;
                    console.log('==>WFtokenServiceURL:'+ WFtokenServiceURL);
                    const WFclientId = oDestination.destinationConfiguration.clientId;
                    console.log('==>WFclientId:'+ WFclientId);
                    const WFclientSecret = oDestination.destinationConfiguration.clientSecret
                    console.log('==>WFclientSecret:'+ WFclientSecret);
                    const WFsUaaCredentials = WFclientId + ':' + WFclientSecret;
                    console.log('==>WFsUaaCredentials:'+ WFsUaaCredentials);

                    /*********************************************************************
                    **** Step 5: Request a JWT token for WF service ***
                    *********************************************************************/
                    const WFpost_options = {
                        url: WFtokenServiceURL, //uaa_service.credentials.url + '/oauth/token', //'https://c0f03a16trial.authentication.eu10.hana.ondemand.com/oauth/token',
                        method: 'POST',
                        headers: {
                            'Authorization': 'Basic ' + Buffer.from(WFsUaaCredentials).toString('base64'),
                            'Content-type': 'application/x-www-form-urlencoded'
                        },
                        form: {
                            'client_id': WFclientId,
                            'grant_type': 'client_credentials'
                        }
                    }
                    console.log(`Call POST: to get oAuth token for WF`);
                    request(WFpost_options, (err, res, data) => {
                        if (res.statusCode === 200) {
                            const WFtoken = JSON.parse(data).access_token;
                            const headerConfig = {
                                headers: { 'Authorization': 'Bearer ' + WFtoken }
                            };
                            console.log(`7.3.headerConfig:${JSON.stringify(headerConfig)}`);
                            console.log(`7.4.Payload:${JSON.stringify(payload)}`);
                            /*********************************************************************
                            **** Step 6: Post WF change ***
                            *********************************************************************/                            
                            axios
                                .post(WFurl, payload, headerConfig)
                                .then(res => {
                                    //console.log(`statusCode: ${res.IncomingMessage}`)
                                    var response = res;
                                    console.log(`SUCCESS: Response Message \n` + JSON.stringify(response.data));
                                    return response;
                                })
                                .catch(error => {
                                    console.error(error)
                            });
                        }
                    });
                });
            }
        });
    }
};

