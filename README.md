# SalesOrder Workflow Management CAP Project

This CAP project is the main custom cloud application running as a microservice in SCP-CF to support the entire Order to Cash flow.
This module encapsulates the underlying data model to support corelation between Sales Orders, delivery and related workflow.
Also this CAP project is liseting to EMS channel for Business Events generated out of S/4 systems, e.g. while outbound delivery is created.

Further this program acts as a broker to mediate actions of Business Events and orchestrate the Workflow actions.

It contains these folders and files, following our recommended project layout:

File / Folder | Purpose
---------|----------
`app/` | content for UI frontends go here
`db/` | your domain models and data go here
`srv/` | your service models and code go here
`package.json` | project metadata and configuration
`readme.md` | this getting started guide


## To run this project...

- Import the project to your workspace in SAP Business Application Studio or VS Code
- Follow depplyment instructions mentioned in the package.json
- Pre-requisite: Check mta.yml for services of type org.cloudfoundry.existing-service. You need to create service instances with the same name before deployment


## Learn more...

Learn more at https://cap.cloud.sap/docs/get-started/
