/*
 *  Copyright 2012 Research In Motion Limited.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ 
var check = require('validator').check,
    sanitize = require('validator').sanitize,
    localize = require("./localize"),
    logger = require("./logger"),
    signingHelper = require("./signing-helper"),
    path = require("path"),
    _self;
    
//NOTE this class is unfinished and is a work in progress
    
_self = {
    //TODO create one global validate method that will validate
    //both the session and configObj?
    validateSession: function (session, widgetConfig) {
        //The string checks below is to get around a really weird issue in commander
        //where sometimes unspecified arguments come in as a function...
        var keysFound = session.keystore,
            cskFound = session.keystoreCsk,//barsigner.csk
            dbFound = session.keystoreDb,//barsigner.db
            keysPassword = session.storepass && typeof session.storepass === "string",
            commandLinebuildId = session.buildId && typeof session.buildId === "string",//--buildId
            buildId = widgetConfig.buildId && typeof widgetConfig.buildId === "string",//Finalized Build ID
            
            //Constants
            AUTHOR_P12 = "author.p12",
            BARSIGNER_CSK = "barsigner.csk",
            BARSIGNER_DB = "barsigner.db",
            
            //Logging function
            signingFileWarn = function (file) {
                logger.warn(localize.translate("WARNING_MISSING_SIGNING_KEY_FILE", file));
            },
            signingFileError = function (file) {
                throw localize.translate("EXCEPTION_MISSING_SIGNING_KEY_FILE", file);
            };
        
        //If -g <password> or --buildId is set, but signing key files are missing, throw an error
        if (keysPassword || commandLinebuildId) {
            if (!keysFound) {
                signingFileError(AUTHOR_P12);
            } else if (!cskFound) {
                signingFileError(BARSIGNER_CSK);
            } else if (!dbFound) {
                signingFileError(BARSIGNER_DB);
            }

        //If a buildId exists in config, but no keys were found, throw a warning
        } else if (buildId) {
            if (!keysFound) {
                signingFileWarn(AUTHOR_P12);
            } else if (!cskFound) {
                signingFileWarn(BARSIGNER_CSK);
            } else if (!dbFound) {
                signingFileWarn(BARSIGNER_DB);
            }
        }
        
        //if -g was provided with NO build id, throw error
        if (keysPassword && !buildId) {
            throw localize.translate("EXCEPTION_MISSING_SIGNING_BUILDID");
        }
        
        if (commandLinebuildId && !keysPassword) {
            //if --buildId was provided with NO password, throw error
            throw localize.translate("EXCEPTION_MISSING_SIGNING_PASSWORD");
        } else if (buildId && !keysPassword) {
            //if a buildId was provided in config.xml with NO password, throw warning
            logger.warn(localize.translate("WARNING_SIGNING_PASSWORD_EXPECTED"));
        }
    },

    //Validation for configObj, iterates through whitelisted features in configObj to remove any non-existing APIs
    validateConfig: function (session, configObj) {
        var extPath = session.conf.EXT,
            apiDir;

        configObj.accessList.forEach(function (object) {
            if (object.hasOwnProperty("features")) {
                for (var index in object.features) {
                    apiDir = path.resolve(extPath, object.features[index].id);
                    if (!path.existsSync(apiDir)) {
                        logger.warn(localize.translate("EXCEPTION_FEATURE_NOT_FOUND", object.features[index].id));
                        object.features.splice(index, 1);
                    }
                }
            }
        });
    }
};

module.exports = _self;
