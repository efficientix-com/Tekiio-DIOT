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

    const SCRIPTS_INFO = values.SCRIPTS_INFO;
    const RECORD_INFO = values.RECORD_INFO;
    const STATUS_LIST_DIOT = values.STATUS_LIST_DIOT;
    const LISTS = values.LISTS;
    const RUNTIME = values.RUNTIME;
    const OPERATION_TYPE = values.OPERATION_TYPE;

    const getInputData = (inputContext) => {
        const objScript = runtime.getCurrentScript();
        const recordID = objScript.getParameter({ name: SCRIPTS_INFO.MAP_REDUCE.PARAMETERS.RECORD_DIOT_ID });
        try{
            /** Se obtiene el motor que se esta usando (legacy or suitetax) */
            var otherId = record.submitFields({
                type: RECORD_INFO.DIOT_RECORD.ID,
                id: recordID,
                values: {
                    [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.OBTAINING_DATA,
                    [RECORD_INFO.DIOT_RECORD.FIELDS.PROGRESS]: 0.0,
                    [RECORD_INFO.DIOT_RECORD.FIELDS.FILE]: ''
                }
            });
            var oneWorldFeature = runtime.isFeatureInEffect({ feature: RUNTIME.FEATURES.SUBSIDIARIES });
            var suitetax = runtime.isFeatureInEffect({ feature: RUNTIME.FEATURES.SUITETAX });
            log.debug('Config_Instance', {oneWorldFeature: oneWorldFeature, suitetax: suitetax});
            // oneWorldFeature = false;
            if (oneWorldFeature == false || suitetax == false) { // si no es oneWorld o SuiteTax
                let newError = generateError('ERROR DE ENTORNO', 'Error de configuración DIOT, contacte a su administrador.', 'Su instancia no esta configurada para trabajar con el modulo DIOT.');
                generateRecordError(newError.name, newError.message, '', '', recordID);
                throw newError;
            }
            let registerData = search.lookupFields({
               type: RECORD_INFO.DIOT_RECORD.ID,
               id: recordID,
               columns: [RECORD_INFO.DIOT_RECORD.FIELDS.SUBSIDIARY, RECORD_INFO.DIOT_RECORD.FIELDS.PERIOD]
            });
            log.audit({title: 'Estado_getInput', details: registerData});
            const recordSubsidiary = registerData[RECORD_INFO.DIOT_RECORD.FIELDS.SUBSIDIARY][0].value;
            const recordPeriod = registerData[RECORD_INFO.DIOT_RECORD.FIELDS.PERIOD][0].value;
            log.debug({ title:'resultData', details:{recordSubsidiary: recordSubsidiary, recordPeriod: recordPeriod} });
            let getVendorBills_result = getVendorBills(recordPeriod, recordSubsidiary, recordID);
            // log.debug({ title:'getVendorBills_result', details:getVendorBills_result });
            if (getVendorBills_result.success == false) {
                let newError = getVendorBills_result.error;
                throw newError;
            }
            var otherId = record.submitFields({
                type: RECORD_INFO.DIOT_RECORD.ID,
                id: recordID,
                values: {
                    [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.VALIDATING_DATA,
                    [RECORD_INFO.DIOT_RECORD.FIELDS.PROGRESS]: 0.0
                }
            });
            return getVendorBills_result.data;
        } catch (error) {
            log.error({ title:'getInputdata', details:error });
            otherId = record.submitFields({
                type: RECORD_INFO.DIOT_RECORD.ID,
                id: recordID,
                values: {
                    [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.ERROR
                }
            });
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
        try {
            
            // log.debug({ title:'mapContext: ' + mapContext.key, details:mapContext });
            var datos = JSON.parse(mapContext.value);
            let getVendorBillTaxes_result = getVendorBillTaxes(datos.vendorbillInternalId, datos.vendorId, datos.diotRecord);
            // log.debug({ title:'getVendorBillTaxes', details:getVendorBillTaxes_result });
            if (getVendorBillTaxes_result.success == false) {
                throw getVendorBillTaxes_result.error;
            }
            datos['taxes'] = getVendorBillTaxes_result.data;
            let getVendorBillPayment_result = getVendorBillPayment(datos.vendorbillInternalId, datos.vendorId, datos.diotRecord);
            // log.debug({ title:'getVendorBillPayment_result', details:getVendorBillPayment_result });
            if (getVendorBillPayment_result.success == false) {
                throw getVendorBillPayment_result.error;
            }
            datos['payments'] = getVendorBillPayment_result.data;
            // log.debug({ title:'datos_Final: ' + mapContext.key , details:datos });
            let newKey = datos.vendorId + '_' + datos.vendorbillTipoOperacion_Text;
            mapContext.write({
                key:newKey,
                value:datos
            });
        } catch (error) {
            log.error({ title:'map', details:error });
        }
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
        const { key, values } = reduceContext
        const objScript = runtime.getCurrentScript();
        const recordID = objScript.getParameter({ name: SCRIPTS_INFO.MAP_REDUCE.PARAMETERS.RECORD_DIOT_ID });
        try {
            var otherId = record.submitFields({
                type: RECORD_INFO.DIOT_RECORD.ID,
                id: recordID,
                values: {
                    [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.BUILDING,
                    [RECORD_INFO.DIOT_RECORD.FIELDS.FILE]: ''
                }
            });
            log.audit({title:'reduce Data: ' + key, details:{long: values.length, data: values}});
            // obtencion de impuestos configurados a reportar
            var salestaxitemSearchObj = search.create({
                type: "salestaxitem",
                filters:
                [
                   ["isinactive","is","F"], 
                   "AND", 
                   ["custrecord_fb_diot_tipo_imp","noneof","@NONE@"]
                ],
                columns:
                [
                   search.createColumn({name: "name", label: "Nombre"}),
                   search.createColumn({
                      name: "internalid",
                      sort: search.Sort.ASC,
                      label: "ID interno"
                   }),
                   search.createColumn({name: "custrecord_fb_diot_tipo_imp", label: "DIOT - Tipo de impuesto"})
                ]
            });
            var searchTaxCodesNS = salestaxitemSearchObj.runPaged({
                pageSize: 1000
            });
            var codigosReporte = {[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IVA]: [], [RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.RETENCION]: [], [RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IEPS]: [], [RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.EXENTO]: []};
            var codigosReporteIds = [];
            if (searchTaxCodesNS.count > 0) {
                searchTaxCodesNS.pageRanges.forEach(function(pageRange){
                    var myPage = searchTaxCodesNS.fetch({index: pageRange.index});
                    myPage.data.forEach(function(result){
                        let codigoTipo = result.getValue({name: 'custrecord_fb_diot_tipo_imp'});
                        let codigoID = result.getValue({name: 'internalid'});
                        let codigoNombre = result.getValue({name: 'name'});
                        codigosReporteIds.push(codigoID);
                        switch (codigoTipo) {
                            case '1': // IVA
                                codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IVA].push({value: codigoID, text: codigoNombre})
                                break;
                            case '2': // IEPS
                                codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IEPS].push({value: codigoID, text: codigoNombre})
                                break;
                            case '3': // retenciones
                                codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.RETENCION].push({value: codigoID, text: codigoNombre})
                                break;
                            case '4': // Exentos
                                codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.EXENTO].push({value: codigoID, text: codigoNombre})
                                break;
                        }
                    });
                });
            }else{ // si no hay impuestos configurados
                throw generateError('ERROR DE PROCESAMIENTO', 'No se encontraron Impuestos configurados para reportar.', 'Error, no hay codigos de impuestos configurados para el reporte DIOT.');
            }
            var ivas_response, retenciones_response, ieps_respose, exento_response;
            // log.debug({ title:'codigosReporte', details:codigosReporte });

            if (codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IVA].length) {
                ivas_response = extractTaxes(codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IVA], values);
                log.debug({ title:'IVAS', details:ivas_response });
                if (ivas_response.success == false) {
                    throw ivas_response.error;
                }
            }

            if (codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.RETENCION].length) {
                retenciones_response = extractTaxes(codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.RETENCION], values);
                log.debug({ title:'RETENCIONES', details:retenciones_response });
                if (retenciones_response.success == false) {
                    throw retenciones_response.error;
                }
            }

            if (codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IEPS].length) {
                ieps_respose = extractTaxes(codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IEPS], values);
                log.debug({ title:'IEPS', details:ieps_respose });
                if (ieps_respose.success == false) {
                    throw ieps_respose.error;
                }
            }

            if (codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.EXENTO].length) {
                exento_response = extractTaxes(codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.EXENTO], values);
                log.debug({ title:'EXENTOS', details:exento_response });
                if (exento_response.success == false) {
                    throw exento_response.error;
                }
            }
            
            const generalInfo = JSON.parse(values[0]);
            // log.debug({ title:'generalInfo', details:generalInfo });
            let diotLine = generalInfo.vendorTipoTercero_Code + '|' + generalInfo.vendorbillTipoOperacion_Code + '|' + generalInfo.vendorRFC + '|' + generalInfo.vendorTaxId + '|' + generalInfo.vendorNombreExtranjero + '|' + generalInfo.vendorPaisResidencia_Code + '|' + generalInfo.vendorNacionalidad + '|';
            // log.debug({ title:'ivas_response.dataClear', details: (Object.keys(ivas_response.dataClear)).length > 0 });
            if (Object.keys(ivas_response.dataClear).length > 0) {
                if (ivas_response.dataClear['16.0%'] && (generalInfo.vendorTipoTercero == LISTS.TIPO_TERCERO.VALUES.NACIONAL)) {
                    diotLine += ivas_response.dataClear['16.0%'].total;
                }
                diotLine +='|||||';
                if (ivas_response.dataClear['8.0%']) {
                    diotLine += ivas_response.dataClear['8.0%'].total;
                }
                diotLine += '|||';
                if (ivas_response.dataClear['16.0%'] && (generalInfo.vendorTipoTercero == LISTS.TIPO_TERCERO.VALUES.EXTRANJERO)) {
                    diotLine += ivas_response.dataClear['16.0%'].total;
                }
                diotLine += '||||'
                if (ivas_response.dataClear['0.0%'] && (generalInfo.vendorTipoTercero == LISTS.TIPO_TERCERO.VALUES.EXTRANJERO)) {
                    diotLine += ivas_response.dataClear['0.0%'].total;
                }         
                diotLine += '|'
                if (ivas_response.dataClear['0.0%'] && (generalInfo.vendorTipoTercero == LISTS.TIPO_TERCERO.VALUES.NACIONAL)) {
                    diotLine += ivas_response.dataClear['0.0%'].total;
                }
                diotLine += '|'
                if (Object.keys(exento_response.dataClear).length > 0 && (generalInfo.vendorTipoTercero == LISTS.TIPO_TERCERO.VALUES.NACIONAL)) { // columna 22
                    // log.debug({ title:'exento_response.dataClear', details:exento_response });
                    diotLine += exento_response.dataClear['0.0%'].total;
                    // diotLine += 'pendiente columna 22';
                }
                diotLine += '|'
                if (Object.keys(retenciones_response.dataClear).length > 0) { // suma de todas las retenciones
                    let suma_impuestos_response = suma_impuestos(retenciones_response.dataClear);
                    log.debug({ title:'suma_impuestos_response', details:suma_impuestos_response });
                    if (suma_impuestos_response.success == true && suma_impuestos_response.totalRetenciones) {
                        diotLine += suma_impuestos_response.totalRetenciones;
                    }
                }
                diotLine += '|'
                let extract_devoluciones_response = extract_devoluciones(generalInfo.subsidiaria, generalInfo.periodo, generalInfo.vendorId, generalInfo.vendorbillTipoOperacion, codigosReporteIds);
                log.debug({ title:'DEVOLUCIONES', details:extract_devoluciones_response });
                if (extract_devoluciones_response.success == true) {
                    diotLine += extract_devoluciones_response.totalDevoluciones
                }else{
                    throw extract_devoluciones_response.error;
                }
                diotLine += '|\n'
            }
            // log.debug({ title:'diotLine', details:diotLine });
            let objLine = {
                linea: diotLine,
                success: true
            };
            reduceContext.write({
                key: key,
                value: objLine
            });
        } catch (error) {
            log.error({ title:'reduce', details:error });
            let objLine = {
                success: false,
                recordId: recordID,
                error: error,
                values: values
            };
            reduceContext.write({
                key: key,
                value: objLine
            });
        }
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
        const objScript = runtime.getCurrentScript();
        const recordID = objScript.getParameter({ name: SCRIPTS_INFO.MAP_REDUCE.PARAMETERS.RECORD_DIOT_ID });
        const notificar = objScript.getParameter({ name: SCRIPTS_INFO.MAP_REDUCE.PARAMETERS.NOTIFICAR });
        try {
            const { output } = summaryContext;
            var txtDiot = '', txtFolder = 0, txtNombre= '';
            const folderRaiz = objScript.getParameter({ name: SCRIPTS_INFO.MAP_REDUCE.PARAMETERS.FOLDER_RAIZ });
            var hasErrors = false;
            { // validaciones de folders
                if (!folderRaiz) {
                    throw 'Folder raíz no configurado';
                }
                let registerData = search.lookupFields({
                    type: RECORD_INFO.DIOT_RECORD.ID,
                    id: recordID,
                    columns: [RECORD_INFO.DIOT_RECORD.FIELDS.SUBSIDIARY, RECORD_INFO.DIOT_RECORD.FIELDS.PERIOD]
                });
                // log.audit({title: 'Estado_getInput', details: registerData});
                var recordSubsidiary = registerData[RECORD_INFO.DIOT_RECORD.FIELDS.SUBSIDIARY][0].text;
                var recordPeriod = registerData[RECORD_INFO.DIOT_RECORD.FIELDS.PERIOD][0].text;
                recordSubsidiary = recordSubsidiary.split(' : ');
                recordSubsidiary = recordSubsidiary[recordSubsidiary.length - 1];
                recordPeriod = recordPeriod.split(' : ');
                recordPeriod = recordPeriod[recordPeriod.length - 1];
                // log.debug({ title:'resultData', details:{recordSubsidiary: recordSubsidiary, recordPeriod: recordPeriod} });
                let validateFolder_response = validateFolder(folderRaiz, recordSubsidiary, recordPeriod);
                if (validateFolder_response.success == false || !validateFolder_response.folderID) {
                    throw validateFolder_response.error;
                }
                txtFolder = validateFolder_response.folderID;
            }
            { // extracción de nombre
                let fecha = new Date();
                let dateStructure = fecha.getDate() + '-' + (fecha.getMonth()+1) + '-' + fecha.getFullYear() + '_' + fecha.toLocaleTimeString('en-US');
                txtNombre = 'DIOT_' + recordSubsidiary + '_' + recordPeriod + '_' + dateStructure;
            }
            { // extracción de cuerpo de archivo
                output.iterator().each((key, value) => {
                    const jsonValue = JSON.parse(value);
                    // log.debug({ title:'salida', details:{key:key, value: jsonValue} });
                    if (jsonValue.success == true) {
                        txtDiot += jsonValue.linea;
                    }else{
                        // log.error({ title:'Ocurrio un error key: ' + key, details:jsonValue });
                        let reportError = jsonValue.error;
                        generateRecordError(reportError.name, reportError.message, '', '', jsonValue.recordId);
                        hasErrors = true;
                    }
                    return true;
                });
                // log.debug({ title:'txtDiot', details:txtDiot });
            }
            { // Creación de reporte
                if (hasErrors == true) {
                    throw 'Su reporte contiene errores, valide su registro de seguimiento.';
                }else{
                    const fileObj = file.create({
                        name    : txtNombre + '.txt',
                        fileType: file.Type.PLAINTEXT,
                        folder: txtFolder,
                        contents: txtDiot
                    });
                    // var fileId = 456554;
                    var fileId = fileObj.save();
                    if (fileId) {
                        let otherId = record.submitFields({
                            type: RECORD_INFO.DIOT_RECORD.ID,
                            id: recordID,
                            values: {
                                [RECORD_INFO.DIOT_RECORD.FIELDS.FILE]: fileId,
                                [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.COMPLETE,
                            }
                        });
                    }
                }
            }
            log.debug({ title:'Fin del procesamiento', details:'summarize' });
        } catch (error) {
            log.error({ title:'summarize', details:error });
            var otherId = record.submitFields({
                type: RECORD_INFO.DIOT_RECORD.ID,
                id: recordID,
                values: {
                    [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.ERROR
                }
            });
        }
        if (notificar) {
            let send_email_status_response = send_email_status(recordID);
        }
        log.debug({ title:'summarize', details:'Fin de procesamiento DIOT' });
        // var otherId = record.submitFields({
        //     type: RECORD_INFO.DIOT_RECORD.ID,
        //     id: recordID,
        //     values: {
        //         [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.ERROR
        //     }
        // });
    }

    const generateError = (code, msg, cause) =>{
        try {
            var custom_error = newError.create({
                name: code,
                message: 'Generador DIOT: ' + msg,
                cause: cause
            });
            return custom_error;
        } catch (error) {
            log.error({ title:'generateError', details:error });
        }
    }

    const generateRecordError = (type, detail, transaccion, proveedor, recordDiot) => {
        const response = {success: false, error: '', errorId: ''};
        try {
            // log.error({ title:'Crear Error record', details:{type: type, detail:detail, transaccion: transaccion, proveedor: proveedor, recordDiot: recordDiot} });
            let errorRecord = record.create({
                type: RECORD_INFO.ERRORES_DIOT.ID,
                isDynamic: true
            });
            { // seteo de valores
                errorRecord.setValue({
                    fieldId: RECORD_INFO.ERRORES_DIOT.FIELDS.TIPO,
                    value: type
                });
                errorRecord.setValue({
                    fieldId: RECORD_INFO.ERRORES_DIOT.FIELDS.DETALLE,
                    value: detail
                });
                errorRecord.setValue({
                    fieldId: RECORD_INFO.ERRORES_DIOT.FIELDS.TRANSACCION,
                    value: transaccion
                });
                errorRecord.setValue({
                    fieldId: RECORD_INFO.ERRORES_DIOT.FIELDS.PROVEEDOR,
                    value: proveedor
                });
                errorRecord.setValue({
                    fieldId: RECORD_INFO.ERRORES_DIOT.FIELDS.HISTORIAL_DIOT,
                    value: recordDiot
                });
            }
            let recordId = errorRecord.save({
                enableSourcing: false,
                ignoreMandatoryFields: false
            });
            response.errorId = recordId;
            response.success = true;
        } catch (error) {
            log.error({ title:'generateRecordError', details:error });
            response.success = false;
            response.error = error;
        }
        return response;
    }

    const getVendorBills = (recordPeriod, recordSubsidiary, recordID) =>{
        const response = {success: false, error: '', quantityData:'', data: {}};
        try {
            var vendorbillSearchObj = search.create({
                type: RECORD_INFO.VENDOR_BILL_RECORD.ID,
                filters:
                [
                    ["type","anyof","VendBill"], 
                    "AND", 
                    ["subsidiary","anyof",recordSubsidiary], 
                    "AND", 
                    ["postingperiod","abs",recordPeriod], 
                    "AND", 
                    ["mainline","is","T"],
                    "AND", 
                    ["status","anyof","VendBill:B","VendBill:A"],
                    "AND", 
                    ["applyingtransaction","noneof","@NONE@"]
                    // ,"AND",
                    // ["internalid", "is", 28117]
                ],
                columns:
                [
                    search.createColumn({name: "tranid", label: "Número de documento"}),
                    search.createColumn({name: "internalid", label: "ID interno"}),
                    search.createColumn({name: "statusref", label: "Estado"}),
                    search.createColumn({name: "amount", label: "Importe"}),
                    // search.createColumn({name: "applyingtransaction", label: "Aplicación de transacción"}),
                    search.createColumn({name: "custbody_fb_tipo_operacion", label: "Tipo de Operación"}),
                    // search.createColumn({
                    //     name: "type",
                    //     join: "applyingTransaction",
                    //     label: "Tipo"
                    // }),
                    search.createColumn({
                       name: "internalid",
                       join: "vendor",
                       label: "Proveedor ID"
                    }),
                    search.createColumn({
                       name: "custentity_mx_rfc",
                       join: "vendor",
                       label: "RFC"
                    }),
                    search.createColumn({
                       name: "custentity_efx_fe_numregidtrib",
                       join: "vendor",
                       label: "NumRegIdTrib"
                    }),
                    search.createColumn({
                       name: "custentity_fb_diot_prov_type",
                       join: "vendor",
                       label: "Tipo de tercero"
                    }),
                    search.createColumn({
                       name: "custentity_fb_pais_residencia",
                       join: "vendor",
                       label: "País de Residencia"
                    }),
                    search.createColumn({
                       name: "custentity_fb_nombre_extranjero",
                       join: "vendor",
                       label: "Nombre del Extranjero"
                    }),
                    search.createColumn({
                       name: "custentity_fb_nacionalidad",
                       join: "vendor",
                       label: "Nacionalidad"
                    })
                ]
            });
            var vendorbillResult = vendorbillSearchObj.runPaged({
                pageSize: 1000
            });
            if (vendorbillResult.count > 0) {
                let vendorbillFound = [];
                let errorsTrans = [];
                vendorbillResult.pageRanges.forEach(function(pageRange){
                    var myPage = vendorbillResult.fetch({index: pageRange.index});
                    myPage.data.forEach(function(result){
                        let vendorTipoTercero = result.getValue({name: RECORD_INFO.VENDOR_RECORD.FIELDS.TIPO_TERCERO, join: RECORD_INFO.VENDOR_RECORD.ID});
                        let vendorId = result.getValue({name: RECORD_INFO.VENDOR_RECORD.FIELDS.INTERNALID, join: RECORD_INFO.VENDOR_RECORD.ID});
                        let vendorTipoTercero_Text = result.getText({name: RECORD_INFO.VENDOR_RECORD.FIELDS.TIPO_TERCERO, join: RECORD_INFO.VENDOR_RECORD.ID});
                        let vendorTipoTercero_Code = vendorTipoTercero_Text.split(' ');
                        vendorTipoTercero_Code = vendorTipoTercero_Code[0];
                        let vendorbillTipoOperacion = result.getValue({name: RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TIPO_OPERACION});
                        let vendorbillTipoOperacion_Text = result.getText({name: RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TIPO_OPERACION});
                        let vendorbillTipoOperacion_Code = vendorbillTipoOperacion_Text.split(' ');
                        vendorbillTipoOperacion_Code = vendorbillTipoOperacion_Code[0];
                        let vendorbillTranId = result.getValue({name: RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TRANID});
                        let vendorbillInternalId = result.getValue({name: RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.ID});
                        if ( vendorTipoTercero ) {
                            if (vendorbillTipoOperacion) {
                                let vendorRFC = result.getValue({name: RECORD_INFO.VENDOR_RECORD.FIELDS.RFC, join: RECORD_INFO.VENDOR_RECORD.ID});
                                let vendorNombreExtranjero = result.getValue({name: RECORD_INFO.VENDOR_RECORD.FIELDS.NOMBRE_EXTRANJERO, join: RECORD_INFO.VENDOR_RECORD.ID});
                                let vendorPaisResidencia = result.getValue({name: RECORD_INFO.VENDOR_RECORD.FIELDS.PAIS_RESIDENCIA, join: RECORD_INFO.VENDOR_RECORD.ID});
                                let vendorPaisResidencia_Text = result.getText({name: RECORD_INFO.VENDOR_RECORD.FIELDS.PAIS_RESIDENCIA, join: RECORD_INFO.VENDOR_RECORD.ID});
                                let vendorPaisResidencia_Code = vendorPaisResidencia_Text.split(' ');
                                vendorPaisResidencia_Code = vendorPaisResidencia_Code[0];
                                let vendorNacionalidad = result.getValue({name: RECORD_INFO.VENDOR_RECORD.FIELDS.NACIONALIDAD, join: RECORD_INFO.VENDOR_RECORD.ID});
                                let vendorTaxId = result.getValue({name: RECORD_INFO.VENDOR_RECORD.FIELDS.TAX_ID, join: RECORD_INFO.VENDOR_RECORD.ID});
                                let errorControl = false;
                                switch (vendorTipoTercero) {
                                    case LISTS.TIPO_TERCERO.VALUES.NACIONAL:
                                        if (!vendorRFC) {
                                            let errorObj = {
                                                code: 'ERROR PROVEEDOR NACIONAL', 
                                                msg: 'No hay rfc para el proveedor', 
                                                cause: 'Error, No se tiene configurado el rfc del proveedor.', 
                                                proveedor: vendorId, 
                                                transaccion: ''
                                            };
                                            let errorFound = errorsTrans.findIndex((element) => element.code == errorObj.code && element.msg == errorObj.msg && element.proveedor == errorObj.proveedor);
                                            if (errorFound == -1) {
                                                errorsTrans.push(errorObj);
                                                errorControl = true;
                                            }
                                        }
                                        break;
                                    case LISTS.TIPO_TERCERO.VALUES.EXTRANJERO:
                                        // numregfd, nombre extranejero, pais de recidencia solo si hay nombre extranjero, nacionalidad solo si hay nombre extranjero
                                        if (!vendorTaxId || !vendorNombreExtranjero || !vendorPaisResidencia || !vendorNacionalidad) {
                                            let errorObj = {
                                                code: 'ERROR PROVEEDOR EXTRANJERO', 
                                                msg: 'Falta configurar datos de proveedor', 
                                                cause: 'Error, No se tiene configurado el proveedor extranjero.', 
                                                proveedor: vendorId, 
                                                transaccion: ''
                                            };
                                            let errorFound = errorsTrans.findIndex((element) => element.code == errorObj.code && element.msg == errorObj.msg && element.proveedor == errorObj.proveedor);
                                            if (errorFound == -1) {
                                                errorsTrans.push(errorObj);
                                                errorControl = true;
                                            }
                                        }
                                        break;
                                    case LISTS.TIPO_TERCERO.VALUES.GLOBAL:
                                        if (!vendorRFC) {0
                                            let errorObj = {
                                                code: 'ERROR PROVEEDOR GLOBAL', 
                                                msg: 'No hay rfc para el proveedor', 
                                                cause: 'Error, No se tiene configurado el proveedor global.', 
                                                proveedor: vendorId, 
                                                transaccion: ''
                                            };
                                            let errorFound = errorsTrans.findIndex((element) => element.code == errorObj.code && element.msg == errorObj.msg && element.proveedor == errorObj.proveedor);
                                            if (errorFound == -1) {
                                                errorsTrans.push(errorObj);
                                                errorControl = true;
                                            }
                                        }
                                        break;
                                }
                                if (errorControl == false) {
                                    let objVendorBillResult = {
                                        diotRecord: recordID,
                                        periodo: recordPeriod,
                                        subsidiaria: recordSubsidiary,
                                        vendorbillTranId: vendorbillTranId,
                                        vendorbillInternalId: vendorbillInternalId,
                                        vendorbillEstado: result.getValue({name: 'statusref'}),
                                        vendorbillImporte:result.getValue({name: 'amount'}),
                                        // vendorbillTransaccionRelacionadaTipo: result.getValue({name: "type", join: "applyingTransaction"}),
                                        // vendorbillTransaccionRelacionadaId: result.getValue({name: 'applyingtransaction'}),
                                        vendorbillTipoOperacion: vendorbillTipoOperacion,
                                        vendorbillTipoOperacion_Text: vendorbillTipoOperacion_Text,
                                        vendorbillTipoOperacion_Code: vendorbillTipoOperacion_Code,
                                        vendorId: result.getValue({name: "internalid", join: "vendor"}),
                                        vendorRFC: vendorRFC,
                                        vendorTaxId: vendorTaxId,
                                        vendorTipoTercero: vendorTipoTercero,
                                        vendorTipoTercero_Text: vendorTipoTercero_Text,
                                        vendorTipoTercero_Code: vendorTipoTercero_Code,
                                        vendorNombreExtranjero: vendorNombreExtranjero,
                                        vendorPaisResidencia: vendorPaisResidencia,
                                        vendorPaisResidencia_Text: vendorPaisResidencia_Text,
                                        vendorPaisResidencia_Code: vendorPaisResidencia_Code,
                                        vendorNacionalidad: vendorNacionalidad
                                    };
                                    vendorbillFound.push(objVendorBillResult);
                                }
                            }else{
                                let errorObj ={
                                    code: 'ERROR EN FACTURA', 
                                    msg: 'Transaccion no configurada adecuadamente', 
                                    cause: 'Error, No se tiene configurado el tipo de operacion en la transaccion.', 
                                    proveedor: vendorId, 
                                    transaccion: vendorbillInternalId
                                };
                                let errorFound = errorsTrans.findIndex((element) => element.code == errorObj.code && element.msg == errorObj.msg && element.proveedor == errorObj.proveedor && element.transaccion == errorObj.transaccion);
                                if (errorFound == -1) {
                                    errorsTrans.push(errorObj);
                                }
                            }
                        }else{
                            // log.debug({ title:'ERROR PROVEEDOR', details:{msg: 'No hay tipo de tercero', tranid: vendorbillTranId, id: vendorbillInternalId} });
                            let errorObj = {
                                code: 'ERROR EN PROVEEDOR', 
                                msg: 'Proveedor no configurado adecuadamente', 
                                cause: 'Error, No se tiene configurado el tipo de tercero del proveedor.', 
                                proveedor: vendorId, 
                                transaccion: ''
                            };
                            let errorFound = errorsTrans.findIndex((element) => element.code == errorObj.code && element.msg == errorObj.msg && element.proveedor == errorObj.proveedor);
                            if (errorFound == -1) {
                                errorsTrans.push(errorObj);
                            }
                        }
                    });
                });
                errorsTrans.forEach((element, index) => {
                    generateRecordError(element.code, element.msg, element.transaccion, element.proveedor, recordID);
                });
                // log.debug({ title:'vendorbillFound_long', details:vendorbillFound.length });
                // log.debug({ title:'vendorbillFound', details:vendorbillFound });
                var vendorbillFoundClear = {};
                vendorbillFound.forEach((element, index) => {
                    // log.debug({ title:'element: ' + index, details:element });
                    let identify = element.vendorbillTranId + '_' + element.vendorbillInternalId;
                    if (!vendorbillFoundClear.hasOwnProperty(identify)) {
                        vendorbillFoundClear[identify] = element;   
                    }
                });
                // log.debug({ title:'vendorbillFoundClear', details:vendorbillFoundClear });
                response.success = true;
                response.quantityData = Object.keys(vendorbillFoundClear).length;
                response.data = vendorbillFoundClear;
            }else{ // si no hay facturas
                let newError = generateError('ERROR DE PROCESAMIENTO', 'No se encontraron Facturas a reportar con los datos ingresados.', 'Error, la busqueda guardada regreso una cantidad de resultados cero.');
                generateRecordError('ERROR DE PROCESAMIENTO', 'No se encontraron Facturas a reportar con los datos ingresados.', '', '', recordID);
                throw newError;
            }
        } catch (error) {
            log.error({ title:'getVendorBills', details:error });
            response.success = false;
            response.error = error;
        }
        return response;
    }

    const getVendorBillTaxes = (vendorbillInternalId, vendorId, diotRecord)=>{
        const response = {success: false, error: '', data: []};
        try {
            // log.debug({ title:'vendorbillInternalId', details:vendorbillInternalId });
            var vendorbillSearchObj = search.create({
                type: "vendorbill",
                filters:
                [
                   ["mainline","is","F"], 
                   "AND", 
                   ["taxline","is","F"], 
                   "AND", 
                   ["internalid","anyof",vendorbillInternalId]
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "ID interno"}),
                   search.createColumn({name: "item", label: "Artículo"}),
                   search.createColumn({
                      name: "taxbasis",
                      join: "taxDetail",
                      label: "Base de impuesto (moneda extranjera)"
                   }),
                   search.createColumn({
                      name: "taxcode",
                      join: "taxDetail",
                      label: "Código de impuesto"
                   }),
                   search.createColumn({
                      name: "taxtype",
                      join: "taxDetail",
                      label: "Tipo de impuesto"
                   }),
                   search.createColumn({
                      name: "taxfxamount",
                      join: "taxDetail",
                      label: "Importe de impuestos (moneda extranjera)"
                   }),
                   search.createColumn({
                      name: "taxrate",
                      join: "taxDetail",
                      label: "Tax Rate"
                   })
                ]
            });
            var vendorbillResult = vendorbillSearchObj.runPaged({
                pageSize: 1000
            });
            if (vendorbillResult.count > 0) {
                vendorbillResult.pageRanges.forEach(function(pageRange){
                    var myPage = vendorbillResult.fetch({index: pageRange.index});
                    var taxes = [];
                    myPage.data.forEach(function(result){
                        let taxItem = result.getValue({name: 'item'});
                        let taxBasis = result.getValue({name: "taxbasis", join: "taxDetail"});
                        let taxCode = result.getValue({name: "taxcode", join: "taxDetail"});
                        let taxType = result.getValue({name: "taxtype", join: "taxDetail"});
                        let taxAmount = result.getValue({name: "taxfxamount", join: "taxDetail"});
                        let taxRate = result.getValue({name: "taxrate", join: "taxDetail"});
                        let taxObj = {
                            taxItem: taxItem,
                            taxBasis: taxBasis,
                            taxCode: taxCode,
                            taxType: taxType,
                            taxAmount: taxAmount,
                            taxRate: taxRate
                        };
                        taxes.push(taxObj);
                    });
                    // log.debug({ title:'taxes', details:taxes });
                    response.success = true;
                    response.data = taxes;
                });
            }else{
                let newError = generateError('ERROR NO IMPUESTOS', 'La factura no cuenta con impuestos registrados', 'La factura id: ' + vendorbillInternalId + ' no contiene impuestos.');
                generateRecordError('ERROR NO IMPUESTOS', 'La factura no cuenta con impuestos registrados', vendorbillInternalId, vendorId, diotRecord);
                throw newError;
            }
        } catch (error) {
            log.error({ title:'getVendorBillTaxes', details:error });
            response.success =  false;
            response.error = error;
        }
        return response;
    }

    const getVendorBillPayment = (vendorbillInternalId, vendorId, diotRecord) =>{
        const response = {success: false, error: '', data: []};
        try {
            var vendorpaymentSearchObj = search.create({
                type: "vendorpayment",
                filters:
                [
                   ["type","anyof","VendPymt"], 
                   "AND", 
                   ["mainline","is","F"], 
                   "AND", 
                   ["appliedtotransaction.internalid","anyof",vendorbillInternalId]
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "ID interno"}),
                   search.createColumn({
                      name: "transactionname",
                      join: "appliedToTransaction",
                      label: "Nombre de la transacción"
                   }),
                   search.createColumn({
                      name: "internalid",
                      join: "appliedToTransaction",
                      label: "ID interno"
                   }),
                   search.createColumn({name: "appliedtolinkamount", label: "Aplicado al vínculo importe"})
                ]
            });
            var vendorbillResult = vendorpaymentSearchObj.runPaged({
                pageSize: 1000
            });
            if (vendorbillResult.count > 0) {
                vendorbillResult.pageRanges.forEach(function(pageRange){
                    var myPage = vendorbillResult.fetch({index: pageRange.index});
                    var payments = {};
                    myPage.data.forEach(function(result){
                        let paymentId = result.getValue({name: 'internalid'});
                        let vendorbillId = result.getValue({name: "internalid", join: "appliedToTransaction"});
                        let vendorbillName = result.getValue({name: "transactionname", join: "appliedToTransaction"});
                        let paymentAmountApply = 0;
                        paymentAmountApply = paymentAmountApply + Number(result.getValue({name: "appliedtolinkamount"}));
                        // paymentAmountApply = (Number(paymentAmountApply));
                        // log.debug({ title:'paymentAmountApply', details:paymentAmountApply });
                        // log.debug({ title:'tipo de', details:typeof(paymentAmountApply) });
                        let paymentObj = {
                            paymentId: paymentId,
                            vendorbillId: vendorbillId,
                            vendorbillName: vendorbillName,
                            paymentAmountApply: paymentAmountApply
                        }
                        let identify = vendorbillId + '_' + paymentId;
                        if (!payments.hasOwnProperty(identify)) {
                            payments[identify] = paymentObj;
                        }else{
                            payments[identify].paymentAmountApply = (payments[identify].paymentAmountApply*1) + (paymentAmountApply*1);
                        }
                    });
                    // log.debug({ title:'payments by: ' + vendorbillInternalId, details:payments });
                    response.data = payments;
                    response.success = true;
                });
            }else{
                let newError = generateError('ERROR NO PAGOS', 'La factura no cuenta con pagos registrados', 'La factura id: ' + vendorbillInternalId + ' no contiene pagos.');
                generateRecordError('ERROR NO PAGOS', 'La factura no cuenta con pagos registrados', vendorbillInternalId, vendorId, diotRecord);
                throw newError;
            }
        } catch (error) {
            log.error({ title:'getVendorBillPayment', details:error });
            response.success = false;
            response.error = error;
        }
        return response;
    }

    const extractTaxes = (impuestos, values) =>{
        const response = {success: false, error: '', data: [], dataClear: {}};
        try {
            // log.debug({ title:'impuestos', details:impuestos });
            // log.debug({ title:'values', details:values });
            let impuestosFound = [];
            impuestos.forEach((element_impuesto, index_impuesto) => {
                // log.debug({ title:'impuesto ' + index_impuesto, details:element_impuesto });
                let sumaImpuesto = 0;
                let impuestoRate = '';
                values.forEach((element_factura, index_factura) => {
                    let factura = JSON.parse(element_factura);
                    // log.debug({ title:'extractTaxes_factura ' + index_factura, details:factura });
                    const taxes = factura.taxes;
                    taxes.forEach((tax, index_tax) => {
                        if (tax.taxCode == element_impuesto.value) {
                            // log.debug({ title:'tax found ' + index_tax, details:tax });
                            impuestoRate = tax.taxRate;
                            if (factura.vendorbillEstado != "open") {
                                sumaImpuesto = (sumaImpuesto*1) + (tax.taxBasis*1);
                            }else{
                                let pagosObj = factura.payments;
                                let pagosIds = Object.keys(pagosObj);
                                let totalpagado = 0;
                                pagosIds.forEach((element) => {
                                    let montoApply = pagosObj[element].paymentAmountApply;
                                    let paymentId = pagosObj[element].paymentId;
                                    // log.debug({ title:'datos extract', details:{montoApply: montoApply, paymentId: paymentId} });
                                    totalpagado = (totalpagado*1) + (montoApply*1);
                                });
                                totalpagado = totalpagado.toFixed(2);
                                let equivalentePagado = ((totalpagado*1)*(tax.taxBasis*1))/(factura.vendorbillImporte*1);
                                equivalentePagado = equivalentePagado.toFixed(2);
                                // log.debug({ title:'finales', details:{totalpagado: totalpagado, equivalentePagado: equivalentePagado} });
                                sumaImpuesto = (sumaImpuesto*1) + (equivalentePagado*1);
                            }
                        }
                    });
                });
                impuestosFound.push({impuesto: element_impuesto, sumaImpuesto: sumaImpuesto, taxRate: impuestoRate});
            });
            response.data = impuestosFound;
            let impuestosFoundClear = {};
            impuestosFound.forEach((elemento, index) => {
                if (elemento.taxRate) {
                    if (impuestosFoundClear.hasOwnProperty(elemento.taxRate)) {
                        impuestosFoundClear[elemento.taxRate]['total'] = impuestosFoundClear[elemento.taxRate].total + elemento.sumaImpuesto;
                        impuestosFoundClear[elemento.taxRate]['hijos'].push(elemento);
                    }else{
                        impuestosFoundClear[elemento.taxRate] = {total: 0, hijos: []}
                        impuestosFoundClear[elemento.taxRate]['total'] = elemento.sumaImpuesto;
                        impuestosFoundClear[elemento.taxRate]['hijos'].push(elemento);
                    }
                }
            });
            // log.debug({ title:'impuestosFoundClear', details:impuestosFoundClear });
            
            response.dataClear = impuestosFoundClear;
            response.success = true;
        } catch (error) {
            log.error({ title:'extractTaxes', details:error });
            response.success = false;
            response.error = error;
        }
        return response;
    }

    const validateFolder = (folderId, subsidiaria, periodo) =>{
        const response = {success: false, error: '', folderID: ''};
        try {
            let subsidiariafolder_result = search_folder(subsidiaria, folderId);
            if (subsidiariafolder_result.success == false) {
                throw subsidiariafolder_result.error;
            }
            let subsidiariaFolder;
            if (subsidiariafolder_result.folderID == -1) { //crear folder
                let createSubsidiariaFolder = create_folder(subsidiaria, folderId);
                if (createSubsidiariaFolder.success == false) {
                    throw createSubsidiariaFolder.error;
                }
                subsidiariaFolder = createSubsidiariaFolder.folderID;
            }else{ // ya existe folder
                subsidiariaFolder = subsidiariafolder_result.folderID;
            }
            let periodoFolder_result = search_folder(periodo, subsidiariaFolder);
            if (periodoFolder_result.success == false) {
                throw periodoFolder_result.error;
            }
            let periodoFolder;
            if (periodoFolder_result.folderID == -1) { // crear folder
                let createPeriodoFolder = create_folder(periodo, subsidiariaFolder);
                if (createPeriodoFolder.success == false) {
                    throw createPeriodoFolder.error;
                }
                periodoFolder = createPeriodoFolder.folderID;
            }else{ // ya existe folder
                periodoFolder = periodoFolder_result.folderID;
            }
            if (periodoFolder) {
                response.folderID = periodoFolder;
            }else{
                response.folderID = folderId;
            }
            response.success = true;
        } catch (error) {
            log.error({ title:'validateFolder', details:error });
            response.success = false;
            response.error = error;
        }
        return response
    }

    function search_folder(folderName, parentFolder) {
        const response = {success: false, error: '', folderID: -1}
        try {
            const folderSearchVendor = search.create({
                type: search.Type.FOLDER,
                filters:
                [
                   ["parent", search.Operator.ANYOF, parentFolder],
                   "AND", 
                   ["name", search.Operator.IS, folderName]
                ],
                columns:
                [
                    search.createColumn({
                        name: "internalid",
                        sort: search.Sort.ASC,
                        label: "Internal ID"
                    }),
                    search.createColumn({name: "name", label: "Name"}),
                    search.createColumn({name: "foldersize", label: "Size (KB)"}),
                    search.createColumn({name: "lastmodifieddate", label: "Last Modified"}),
                    search.createColumn({name: "parent", label: "Sub of"}),
                    search.createColumn({name: "numfiles", label: "# of Files"})
                ]
            });
            const myPagedData = folderSearchVendor.runPaged({
                pageSize: 1000
            });
            // log.debug("Resultados de folders",myPagedData.count);
            if (myPagedData.count > 0) { // obtener folder
                myPagedData.pageRanges.forEach(function(pageRange){
                    let myPage = myPagedData.fetch({index: pageRange.index});
                    myPage.data.forEach(function(result){
                        response.folderID = result.getValue({name: 'internalid'});
                    });
                });
            }
            response.success = true;
        } catch (error) {
            log.error({ title:'search_folder', details:error });
            response.success = false;
            response.error = error;
        }
        return response;
    }

    function create_folder(folderName, parentFolder) {
        const response = {success: false, error: '', folderID: -1}
        try {
            let objFolder = record.create({
                type: record.Type.FOLDER,
                isDynamic: true
            });

            objFolder.setValue({
                fieldId: 'name',
                value: folderName
            });
            objFolder.setValue({
                fieldId: 'parent',
                value: parentFolder
            });
            response.folderID = objFolder.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            response.success = true;
        } catch (error) {
            log.error({ title:'create_folder', details:error });
            response.success = false;
            response.error = error;
        }
        return response;
    }

    function suma_impuestos(impuestos) {
        const response = {success: false, error: '', totalImpuestos: 0};
        try {
            let impuestosIds = Object.keys(impuestos);
            let sumaImpuestos = 0;
            impuestosIds.forEach((element, index) => {
                log.debug({ title:'retencion: ' + index, details:element });
                sumaImpuestos = (sumaImpuestos*1) + (impuestos[element].total*1);
            });
            sumaImpuestos = sumaImpuestos.toFixed(2);
            response.totalImpuestos = sumaImpuestos;
            response.success = true;
        } catch (error) {
            log.error({ title:'suma_impuestos', details:error });
            response.success = false;
            response.error = error;
        }
        return response;
    }

    function extract_devoluciones(subsidiaria, periodo, proveedor, tipoOperacion, taxCodes) {
        const response = {success: false, error: '', totalDevoluciones: ''};
        try {
            // log.debug({ title:'extract_devoluciones_PARAMAS', details:{subsidiaria: subsidiaria, periodo: periodo, proveedor: proveedor, tipoOperacion: tipoOperacion} });
            // log.debug({ title:'taxCodes', details:taxCodes });
            var vendorcreditSearchObj = search.create({
                type: "vendorcredit",
                filters:
                [
                   ["type","anyof","VendCred"], 
                   "AND", 
                   ["subsidiary","anyof",subsidiaria], 
                   "AND", 
                   ["postingperiod","abs",periodo], 
                   "AND", 
                   ["vendor.internalid","anyof",proveedor], 
                   "AND", 
                   ["custbody_fb_tipo_operacion","anyof",tipoOperacion], 
                   "AND", 
                   ["taxline","is","F"], 
                   "AND", 
                   ["mainline","is","F"]
                ],
                columns:
                [
                   search.createColumn({
                      name: "internalid",
                      sort: search.Sort.ASC,
                      label: "ID interno"
                   }),
                   search.createColumn({name: "tranid", label: "Número de documento"}),
                   search.createColumn({
                      name: "taxbasis",
                      join: "taxDetail",
                      label: "Base de impuesto (moneda extranjera)"
                   }),
                   search.createColumn({
                      name: "taxcode",
                      join: "taxDetail",
                      label: "Código de impuesto"
                   }),
                   search.createColumn({
                      name: "taxrate",
                      join: "taxDetail",
                      label: "Tax Rate"
                   })
                ]
            });
            const myPagedData = vendorcreditSearchObj.runPaged({
                pageSize: 1000
            });
            if (myPagedData.count > 0) {
                response.totalDevoluciones = 0;
                myPagedData.pageRanges.forEach(function(pageRange){
                    let myPage = myPagedData.fetch({index: pageRange.index});
                    myPage.data.forEach(function(result){
                        let taxCode = result.getValue({name: "taxcode", join: "taxDetail"});
                        // log.debug({ title:'taxcode', details:taxCode });
                        if (taxCodes.indexOf(taxCode) != -1) {
                            let taxBasis = result.getValue({name: "taxbasis", join: "taxDetail"});
                            response.totalDevoluciones = (response.totalDevoluciones*1) + (taxBasis*1);
                            response.totalDevoluciones = response.totalDevoluciones.toFixed(2);
                        }
                    });
                });
            }
            response.success = true;
        } catch (error) {
            log.error({ title:'extract_devoluciones', details:error });
            response.success = false;
            response.error = error;
        }
        return response;
    }

    function send_email_status(recordId) {
        const response = {success: false, error: ''};
        try {
            log.debug({ title:'sendMail', details:recordId });
            let sender = search.lookupFields({
               type: RECORD_INFO.DIOT_RECORD.ID,
               id: recordId,
               columns: ['owner']
            });
            sender = sender.owner[0].value
            log.debug({ title:'sender', details:sender });
            let receiver = search.lookupFields({
               type: search.Type.EMPLOYEE,
               id: sender,
               columns: ['email']
            });
            receiver = receiver.email;
            log.debug({ title:'receiver', details:receiver });
            email.send({
                author: sender,
                recipients: receiver,
                subject: 'Estado reporte DIOT',
                body: 'Estimado usuario el proceso de generación del reporte DIOT ha concluido, revise su registro de seguimiento con id: ' + recordId,
            });
        } catch (error) {
            response.success = false;
            response.error = error;
        }
        return response;
    }

    return {getInputData, map, reduce, summarize};

});
