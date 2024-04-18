# API-Integration

Author: Luke Bernier

Date: 04/18/24

Description: This program will integrate the REDCap Central API with the current Ripple API for real-time updates to our Ripple server

Dependencies: Node.js, Postman Client, Visual Studio Code, JS Packages(newman, fs, xlsx)

Input:

Output: daily_backup_mm-dd-yyyy.xlsx
        ripple_import_mm-dd-yyyy-hh:mm.xlsx


Change Log: 

   Version 0.0.1: 
   
     - Added README.md
     
     - Uploaded writeToFile.js (This file contains the basics of how we will need to create .xlsx files for Ripple import)

     - Uploaded testREDCapCentral.js (This is a proof of concept for exporting data from REDCap Central)
     
Notes: 
 - DO NOT UPLOAD POSTMAN COLLECTION .json FILES - THESE CONTAIN PASSWORD AND API KEY DATA
