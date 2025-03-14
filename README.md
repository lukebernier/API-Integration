# API-Integration

Author: Luke Bernier

Date: 04/18/24

Description: This program will integrate the REDCap Central API with the current Ripple API for real-time updates to our Ripple server

Dependencies: Node.js, Postman Client, Visual Studio Code, JS Packages(newman, fs, xlsx)

Input:

Output: 

        upload_global.xlsx
        upload_study.xlsx
        log_mm-dd-yyyy-hh-mm_global.xlsx
        log_mm-dd-yyyy-hh-mm_study.xlsx


Change Log: 

        Version 0.1.0:
                - Modified REDCapCentral_Ripple_Integration_Upload.js
                        - Added support for new surveys from ECHO
                        - Only updates participants already in Ripple
                        - Modifies partner family ID
        
        Version 0.0.2:
                - Uploaded REDCapCentral_Ripple_Integration_Upload.js (This file integrates RCC and Ripple)

        Version 0.0.1: 
   
                - Added README.md
     
                - Uploaded writeToFile.js (This file contains the basics of how we will need to create .xlsx files for Ripple import)

                - Uploaded testREDCapCentral.js (This is a proof of concept for exporting data from REDCap Central)
     
