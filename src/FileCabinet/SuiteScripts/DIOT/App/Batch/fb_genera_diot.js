/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/error",'N/runtime', 'N/search', 'N/url', 'N/record', 'N/file', 'N/redirect', 'N/config', 'N/email', 'N/query', '../../Lib/Enum/fb_diot_constants_lib', '../../Lib/Mod/moment_diot'],

 (newError, runtime, search, url, record, file, redirect, config, email, query, values, moment) => {

    /**
     * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
     * @param {Object} inputContext
     * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {Object} inputContext.ObjectRef - Object that references the input data
     * @typedef {Object} ObjectRef
     * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
     * @property {string} ObjectRef.type - Type of the record instance that contains the input data
     * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
     * @since 2015.2
     */

    var taxRateArray = new Array();
    var erroresArray = new Array();

    const SCRIPTS_INFO = values.SCRIPTS_INFO;
    const RECORD_INFO = values.RECORD_INFO;
    const STATUS_LIST_DIOT = values.STATUS_LIST_DIOT;
    const RUNTIME = values.RUNTIME;
    const OPERATION_TYPE = values.OPERATION_TYPE;

    const getInputData = (inputContext) => {
        try{
            var objScript = runtime.getCurrentScript();
            var recordID = objScript.getParameter({ name: SCRIPTS_INFO.MAP_REDUCE.PARAMETERS.RECORD_DIOT_ID }); 
            log.audit({title: 'Estado_getInput', details: "Se esta ejecutando el getInputData"});

            var otherId = record.submitFields({
                type: RECORD_INFO.DIOT_RECORD.ID,
                id: recordID,
                values: {
                    [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.OBTAINING_DATA
                }
            });

            /** Se obtiene el motor que se esta usando (legacy or suitetax) */
            var oneWorldFeature = runtime.isFeatureInEffect({ feature: RUNTIME.FEATURES.SUBSIDIARIES });
            var suitetax = runtime.isFeatureInEffect({ feature: RUNTIME.FEATURES.SUITETAX });
            log.debug('Caracteristicas', {oneWorldFeature: oneWorldFeature, suitetax: suitetax});

            if (oneWorldFeature == true && suitetax == true) { // si es suiteTax
                /* Se realiza la búsqueda de todos los códigos de impuesto */
                var codigosImpuesto = searchCodigoImpuesto(suitetax);
    
                return codigosImpuesto;   
            }else{
                throw generateError('ERROR DE ENTORNO', 'Error de configuración DIOT, contacte a su administrador.', 'Su instancia no esta configurada para trabajar con el modulo DIOT.');
            }
        } catch (error) {
            var recordID = objScript.getParameter({ name: SCRIPTS_INFO.MAP_REDUCE.PARAMETERS.RECORD_DIOT_ID });
            otherId = record.submitFields({
                type: RECORD_INFO.DIOT_RECORD.ID,
                id: recordID,
                values: {
                    [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.ERROR,
                    [RECORD_INFO.DIOT_RECORD.FIELDS.ERROR]: error.message
                }
            });
            log.error({ title: 'Error en la busqueda de Códigos de Impuesto', details: error });
        }

    }
     
     /**
      * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
      * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
      * context.
      * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
      *     is provided automatically based on the results of the getInputData stage.
      * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
      *     function on the current key-value pair
      * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
      *     pair
      * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
      *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
      * @param {string} mapContext.key - Key to be processed during the map stage
      * @param {string} mapContext.value - Value to be processed during the map stage
      * @since 2015.2
      */

     const map = (mapContext) => {

     }

     /**
      * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
      * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
      * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
      *     provided automatically based on the results of the map stage.
      * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
      *     reduce function on the current group
      * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
      * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
      *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
      * @param {string} reduceContext.key - Key to be processed during the reduce stage
      * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
      *     for processing
      * @since 2015.2
      */
     const reduce = (reduceContext) => {

    }

    /**
     * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
     * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
     * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
     * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
     *     script
     * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
     * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
     * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
     * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
     *     script
     * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
     * @param {Object} summaryContext.inputSummary - Statistics about the input stage
     * @param {Object} summaryContext.mapSummary - Statistics about the map stage
     * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
     * @since 2015.2
     */
    const summarize = (summaryContext) => {
        
    }

    const generateError = (code, msg, cause) =>{
        try {
            var custom_error = newError.create({
                name: code,
                message: 'DIOT generator: ' + msg,
                cause: cause
            });
            return custom_error;
        } catch (error) {
            log.error({ title:'generateError', details:error });
        }
    }


    return {getInputData, map, reduce, summarize};

});
