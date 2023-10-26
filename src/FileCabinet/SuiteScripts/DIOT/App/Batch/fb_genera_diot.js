/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/error", 'N/runtime', 'N/search', 'N/url', 'N/record', 'N/file', 'N/redirect', 'N/config', 'N/email', 'N/query', '../../Lib/Enum/fb_diot_constants_lib', '../../Lib/Mod/moment_diot'],

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
            try {
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
                log.debug('Config_Instance', { oneWorldFeature: oneWorldFeature, suitetax: suitetax });
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
                // log.audit({title: 'Estado_getInput', details: registerData});
                const recordSubsidiary = registerData[RECORD_INFO.DIOT_RECORD.FIELDS.SUBSIDIARY][0].value;
                const recordPeriod = registerData[RECORD_INFO.DIOT_RECORD.FIELDS.PERIOD][0].value;
                log.debug({ title: 'resultData', details: { recordSubsidiary: recordSubsidiary, recordPeriod: recordPeriod } });
                let resultPagos = getPaymentsPeriod(recordSubsidiary, recordPeriod);
                log.debug({ title: 'resultPagos', details: resultPagos });
                if (resultPagos.length <= 0) {
                    throw 'No se encontraron transacciones a reportar';
                }
                let getVendorBills_result;
                { // obtencion de facturas de proveedor
                    let extractVendorBill_result = extractVendorBill(resultPagos);
                    log.debug({ title: 'extractVendorBill_result', details: extractVendorBill_result });
                    if (extractVendorBill_result.length <= 0) {
                        throw 'A ocurrido un error al extraer facturas';
                    }
                    getVendorBills_result = getVendorBills(recordPeriod, recordSubsidiary, recordID, extractVendorBill_result);
                    log.debug({ title: 'getVendorBills_result', details: getVendorBills_result });
                    // log.debug({ title:'data', details:getVendorBills_result.data['EKU9003173C9-INV10000221_27995'] });
                    if (getVendorBills_result.success == false) {
                        let newError = getVendorBills_result.error;
                        throw newError;
                    }
                }
                let getExpenseReport_result;
                { // obtencion de informes de gastos
                    let extractExpenseReport_result = extractExpenseReport(resultPagos);
                    log.debug({ title: 'extractExpenseReport_result', details: extractExpenseReport_result });
                    if (extractExpenseReport_result.success == false) {
                        throw extractExpenseReport_result.error;
                    }
                    if (extractExpenseReport_result.data.length > 0) {
                        getExpenseReport_result = getExpenseReport(recordSubsidiary, recordPeriod, recordID, extractExpenseReport_result.data);
                        log.debug({ title: 'getExpenseReport_result', details: getExpenseReport_result });
                        if (getExpenseReport_result.success == false) {
                            let newError = getVendorBills_result.error;
                            throw newError;
                        }
                    }
                }
                let extractJournalEntries_response;
                { // obtencion de Entradas de diario
                    extractJournalEntries_response = extractJournalEntries(recordSubsidiary, recordPeriod, recordID);
                    log.debug({ title: 'extractJournalEntries_response', details: extractJournalEntries_response });
                    if (extractJournalEntries_response.success == false) {
                        let newError = extractJournalEntries_response.error;
                        throw newError;
                    }
                }
                // throw 'Error controlado';
                var dataReturn = {};
                { // agrupar información
                    log.debug({ title: 'extractJournalEntries_response.data', details: extractJournalEntries_response.data });
                    log.audit({ title: 'getVendorBills_result DBG', details: getVendorBills_result});
                    // log.audit({title:'getExpenseReport_result.data',details:getExpenseReport_result.data});
                    dataReturn = Object.assign(dataReturn, getVendorBills_result?getVendorBills_result.data:{}, getExpenseReport_result ? getExpenseReport_result.data : {}, extractJournalEntries_response ? extractJournalEntries_response.data : {});
                    log.debug({ title: 'dataReturn DBG', details: dataReturn });

                }
                // throw 'Error controlado';
                var otherId = record.submitFields({
                    type: RECORD_INFO.DIOT_RECORD.ID,
                    id: recordID,
                    values: {
                        [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.VALIDATING_DATA,
                        [RECORD_INFO.DIOT_RECORD.FIELDS.PROGRESS]: 5.0
                    }
                });
                
                // Object.entries(dataReturn).forEach(([key, val]) => {
                //     log.emergency({ title: 'dataReturn DBG2: '+key, details: val });
                //   });
                return dataReturn;
                // return extractJournalEntries_response.data;
            } catch (error) {
                log.error({ title: 'getInputdata', details: error });
                otherId = record.submitFields({
                    type: RECORD_INFO.DIOT_RECORD.ID,
                    id: recordID,
                    values: {
                        [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.ERROR,
                        [RECORD_INFO.DIOT_RECORD.FIELDS.MESSAGE]: error
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

                var datos = JSON.parse(mapContext.value);
                // var keyOriginal=mapContext.key;
                log.audit({title:'datos DBG',details:datos});
                log.audit({title:'typeof datos DBG2',details:typeof datos});
                // log.audit({title:'datos DBG3',details:datos.hasOwnProperty('generatedNewError')});
                // if(keyOriginal!=="generatedNewError"){

                    if (!datos.hasOwnProperty('isJournalEntry')) {
                        if (!datos.hasOwnProperty('isExpenseReport')) {
                            log.emergency({title:'datos.transaccionInternalId DBG',details:datos.transaccionInternalId});
                            if(datos.transaccionInternalId){

                                let getVendorBillTaxes_result = getVendorBillTaxes(datos.transaccionInternalId, datos.vendorId, datos.diotRecord);
                                // log.debug({ title:'getVendorBillTaxes', details:getVendorBillTaxes_result });
                                if (getVendorBillTaxes_result.success == false) {
                                    throw getVendorBillTaxes_result.error;
                                }
                                datos['taxes'] = getVendorBillTaxes_result.data;
                            }
                        }
                        // log.debug({ title:'datos: ' + mapContext.key, details:datos });
                        let getApllyPayments_result = getApllyPayments(datos.transaccionInternalId, datos.vendorId, datos.diotRecord, datos.subsidiaria, datos.periodo);
                        // log.debug({ title:'getApllyPayments_result', details:getApllyPayments_result });
                        if (getApllyPayments_result.success == false) {
                            throw getApllyPayments_result.error;
                        }
                        datos['payments'] = getApllyPayments_result.data;
                    }
                    let newKey = '';

                    if (datos.vendorRFC) {
                        newKey += 'rfc_' + datos.vendorRFC + '_';
                    }
                    if (datos.vendorId) {
                        newKey += 'id_' + datos.vendorId + '_';
                    }
                    
                    
                    
                    newKey += datos.transaccionTipoOperacion_Text;
                

                    // log.audit({title:'keyOriginal=="generatedNewError"',details:keyOriginal=="generatedNewError"});
                    // if(keyOriginal==='generatedNewError'){
    
                    //     datos.generatedNewError=datos;
                    //     log.debug({ title:'datos_Final DBG2: ' + newKey , details:datos.generatedNewError });
                    // }
                // log.debug({title:'datos.hasOwnProperty("generatedNewError")',details:datos.hasOwnProperty("generatedNewError")});
                log.debug({ title:'datos_Final DBG: ' + newKey , details:datos });
                mapContext.write({
                    key: newKey,
                    value: datos
                });
            } catch (error) {
                log.error({ title: 'map', details: error });
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
                let objLine;
                var otherId = record.submitFields({
                    type: RECORD_INFO.DIOT_RECORD.ID,
                    id: recordID,
                    values: {
                        [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.BUILDING,
                        [RECORD_INFO.DIOT_RECORD.FIELDS.FILE]: ''
                    }
                });
                log.audit({ title: 'reduce Data: ' + key, details: { long: values.length, data: values } });
                // log.audit({ title: 'reduce Data DBG: ', details: values['generatedNewError']});
                // log.audit({ title: 'reduce Data DBG2: ', details: values[0].generatedNewError});
                // obtencion de impuestos configurados a reportar
                var salestaxitemSearchObj = search.create({
                    type: "salestaxitem",
                    filters:
                        [
                            ["isinactive", "is", "F"],
                            "AND",
                            ["custrecord_fb_diot_tipo_imp", "noneof", "@NONE@"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "name", label: "Nombre" }),
                            search.createColumn({
                                name: "internalid",
                                sort: search.Sort.ASC,
                                label: "ID interno"
                            }),
                            search.createColumn({ name: "custrecord_fb_diot_tipo_imp", label: "DIOT - Tipo de impuesto" })
                        ]
                });
                var searchTaxCodesNS = salestaxitemSearchObj.runPaged({
                    pageSize: 1000
                });
                var codigosReporte = { [RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IVA]: [], [RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.RETENCION]: [], [RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IEPS]: [], [RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.EXENTO]: [] };
                var codigosReporteIds = [];
                if (searchTaxCodesNS.count > 0) {
                    searchTaxCodesNS.pageRanges.forEach(function (pageRange) {
                        var myPage = searchTaxCodesNS.fetch({ index: pageRange.index });
                        myPage.data.forEach(function (result) {
                            let codigoTipo = result.getValue({ name: 'custrecord_fb_diot_tipo_imp' });
                            let codigoID = result.getValue({ name: 'internalid' });
                            let codigoNombre = result.getValue({ name: 'name' });
                            codigosReporteIds.push(codigoID);
                            switch (codigoTipo) {
                                case '1': // IVA
                                    codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IVA].push({ value: codigoID, text: codigoNombre })
                                    break;
                                case '2': // IEPS
                                    codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IEPS].push({ value: codigoID, text: codigoNombre })
                                    break;
                                case '3': // retenciones
                                    codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.RETENCION].push({ value: codigoID, text: codigoNombre })
                                    break;
                                case '4': // Exentos
                                    codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.EXENTO].push({ value: codigoID, text: codigoNombre })
                                    break;
                            }
                        });
                    });
                } else { // si no hay impuestos configurados
                    throw generateError('ERROR DE PROCESAMIENTO', 'No se encontraron Impuestos configurados para reportar.', 'Error, no hay codigos de impuestos configurados para el reporte DIOT.');
                }
                var ivas_response, retenciones_response, ieps_respose, exento_response;
                // log.debug({ title:'codigosReporte', details:codigosReporte });

                if (codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IVA].length) {
                    ivas_response = extractTaxes(codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IVA], values);
                    log.debug({ title: 'IVAS', details: ivas_response });
                    if (ivas_response.success == false) {
                        throw ivas_response.error;
                    }
                }

                if (codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.RETENCION].length) {
                    retenciones_response = extractTaxes(codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.RETENCION], values);
                    log.debug({ title: 'RETENCIONES', details: retenciones_response });
                    if (retenciones_response.success == false) {
                        throw retenciones_response.error;
                    }
                }

                if (codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IEPS].length) {
                    ieps_respose = extractTaxes(codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IEPS], values);
                    log.debug({ title: 'IEPS', details: ieps_respose });
                    if (ieps_respose.success == false) {
                        throw ieps_respose.error;
                    }
                }

                if (codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.EXENTO].length) {
                    exento_response = extractTaxes(codigosReporte[RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.EXENTO], values);
                    log.debug({ title: 'EXENTOS', details: exento_response });
                    if (exento_response.success == false) {
                        throw exento_response.error;
                    }
                }

                const generalInfo = JSON.parse(values[0]);
                log.debug({ title:'generalInfo', details:generalInfo });
                let diotLine = generalInfo.vendorTipoTercero_Code + '|' + generalInfo.transaccionTipoOperacion_Code + '|' + generalInfo.vendorRFC + '|' + generalInfo.vendorTaxId + '|' + generalInfo.vendorNombreExtranjero + '|' + generalInfo.vendorPaisResidencia_Code + '|' + generalInfo.vendorNacionalidad + '|';
                log.debug({ title:'ivas_response DB', details: ivas_response });
                if (ivas_response) {
                    if (Object.keys(ivas_response.dataClear).length > 0) {
                        log.debug({ title:'ivas_response.dataClear DB', details: (Object.keys(ivas_response.dataClear)).length > 0 });
                        if (ivas_response.dataClear['16.0%'] && (generalInfo.vendorTipoTercero == LISTS.TIPO_TERCERO.VALUES.NACIONAL)) {
                            diotLine += ivas_response.dataClear['16.0%'].total;
                        }
                        diotLine += '|||||';
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
                        if(exento_response){

                            if (Object.keys(exento_response.dataClear).length > 0 && (generalInfo.vendorTipoTercero == LISTS.TIPO_TERCERO.VALUES.NACIONAL)) { // columna 22
                                // log.debug({ title:'exento_response.dataClear', details:exento_response });
                                diotLine += exento_response.dataClear['0.0%'].total;
                                // diotLine += 'pendiente columna 22';
                            }
                        }
                        diotLine += '|'
                        if(retenciones_response){
                            if (Object.keys(retenciones_response.dataClear).length > 0) { // suma de todas las retenciones
                                let suma_impuestos_response = suma_impuestos(retenciones_response.dataClear);
                                log.debug({ title: 'suma_impuestos_response', details: suma_impuestos_response });
                                if (suma_impuestos_response.success == true && suma_impuestos_response.totalRetenciones) {
                                    diotLine += suma_impuestos_response.totalRetenciones;
                                }
                            }
                        }
                        diotLine += '|'
                        let devolucionesImporte = 0;
                        let extract_devoluciones_response = extract_devoluciones(generalInfo.subsidiaria, generalInfo.periodo, generalInfo.vendorId, generalInfo.transaccionTipoOperacion, codigosReporteIds, generalInfo.vendorRFC);
                        log.debug({ title: 'DEVOLUCIONES Creditos', details: extract_devoluciones_response });
                        if (extract_devoluciones_response.success == true) {
                            if (extract_devoluciones_response.totalDevoluciones) {
                                devolucionesImporte = devolucionesImporte + (extract_devoluciones_response.totalDevoluciones * 1);
                            }
                        } else {
                            throw extract_devoluciones_response.error;
                        }
                        let getJEDevoluciones_response = getJEDevoluciones(values);
                        log.debug({ title: 'DEVOLUCIONES JE', details: getJEDevoluciones_response });
                        if (getJEDevoluciones_response.success == true) {
                            if (getJEDevoluciones_response.total != 0) {
                                devolucionesImporte = (devolucionesImporte * 1) + (getJEDevoluciones_response.total * 1);
                            }
                        } else {
                            throw getJEDevoluciones_response.error;
                        }
                        if (devolucionesImporte != 0) {
                            diotLine += devolucionesImporte;
                        }
                    }
                }
                diotLine += '|\n';
                // log.debug({ title:'diotLine', details:diotLine });
                objLine = {
                    linea: diotLine,
                    success: true,
                    generatedNewError:generalInfo.generatedNewError
                };
                reduceContext.write({
                    key: key,
                    value: objLine
                });
            } catch (error) {
                log.error({ title: 'reduce', details: error });
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
                var txtDiot = '', txtFolder = 0, txtNombre = '';
                var hasErrors_inSomeTrans=false;
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
                    let dateStructure = fecha.getDate() + '-' + (fecha.getMonth() + 1) + '-' + fecha.getFullYear() + '_' + fecha.toLocaleTimeString('en-US');
                    txtNombre = 'DIOT_' + recordSubsidiary + '_' + recordPeriod + '_' + dateStructure;
                }
                { // extracción de cuerpo de archivo
                    output.iterator().each((key, value) => {
                        const jsonValue = JSON.parse(value);
                        log.debug({ title:'salida DBG', details:{key:key, value: jsonValue} });
                        if (jsonValue.success == true) {
                            txtDiot += jsonValue.linea;
                            if(jsonValue.generatedNewError){
                                hasErrors_inSomeTrans=jsonValue.generatedNewError
                            }
                        } else {
                            // log.error({ title:'Ocurrio un error key: ' + key, details:jsonValue });
                            let reportError = jsonValue.error;
                            log.audit({title:'reportError.message DBG',details:reportError.message});
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
                    } else {
                        const fileObj = file.create({
                            name: txtNombre + '.txt',
                            fileType: file.Type.PLAINTEXT,
                            folder: txtFolder,
                            contents: txtDiot
                        });
                        // var fileId = 456554;
                        var fileId = fileObj.save();
                        if (fileId) {
                            if (txtDiot === '' && hasErrors_inSomeTrans==false) {
                                let otherId = record.submitFields({
                                    type: RECORD_INFO.DIOT_RECORD.ID,
                                    id: recordID,
                                    values: {
                                        [RECORD_INFO.DIOT_RECORD.FIELDS.FILE]: fileId,
                                        [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.ERROR,
                                        [RECORD_INFO.DIOT_RECORD.FIELDS.PROGRESS]: 0,
                                    }
                                });
                                log.audit({ title: 'otherId COMPLETE STATUS', details: otherId });
                            } else if(hasErrors_inSomeTrans){
                                let otherId = record.submitFields({
                                    type: RECORD_INFO.DIOT_RECORD.ID,
                                    id: recordID,
                                    values: {
                                        [RECORD_INFO.DIOT_RECORD.FIELDS.FILE]: fileId,
                                        [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.PARTIALLY_COMPLETE,
                                        [RECORD_INFO.DIOT_RECORD.FIELDS.MESSAGE]: "Favor de atender los errores presentados y volver a generar para incluirlos dentro de su archivo DIOT.",
                                        [RECORD_INFO.DIOT_RECORD.FIELDS.PROGRESS]: 100,
                                    }
                                });
                                log.audit({ title: 'otherId PARTIAL COMPLETE STATUS', details: otherId });
                            }
                            else {

                                let otherId = record.submitFields({
                                    type: RECORD_INFO.DIOT_RECORD.ID,
                                    id: recordID,
                                    values: {
                                        [RECORD_INFO.DIOT_RECORD.FIELDS.FILE]: fileId,
                                        [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.COMPLETE,
                                        [RECORD_INFO.DIOT_RECORD.FIELDS.MESSAGE]: "Archivo DIOT creado con éxito.",

                                        [RECORD_INFO.DIOT_RECORD.FIELDS.PROGRESS]: 100,
                                    }
                                });
                                log.audit({ title: 'otherId COMPLETE STATUS', details: otherId });
                            }
                        }
                        log.audit({ title: 'fileId COMPLETE STATUS', details: fileId });
                    }
                }
                log.debug({ title: 'Fin del procesamiento', details: 'summarize' });
            } catch (error) {
                log.error({ title: 'summarize', details: error });
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
            log.debug({ title: 'summarize', details: 'Fin de procesamiento DIOT' });
            // var otherId = record.submitFields({
            //     type: RECORD_INFO.DIOT_RECORD.ID,
            //     id: recordID,
            //     values: {
            //         [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.ERROR
            //     }
            // });
        }

        /**
         * The function `generateError` creates a custom error object with a specified code, message, and
         * cause.
         * @param code - The code parameter is a string that represents the error code or identifier for
         * the custom error. It is used to uniquely identify the error and can be used for error handling
         * and debugging purposes.
         * @param msg - The `msg` parameter is a string that represents the error message. It is used to
         * provide a description or explanation of the error that occurred.
         * @param cause - The `cause` parameter is an optional parameter that represents the underlying
         * cause of the error. It can be used to provide additional information about why the error
         * occurred.
         * @returns The function `generateError` returns a custom error object.
         */
        const generateError = (code, msg, cause) => {
            try {
                var custom_error = newError.create({
                    name: code,
                    message: 'Generador DIOT: ' + msg,
                    cause: cause
                });
                return custom_error;
            } catch (error) {
                log.error({ title: 'generateError', details: error });
            }
        }

        /**
         * The function `generateRecordError` creates a new error record in NetSuite with the provided
         * details.
         * @param type - The type of error being generated.
         * @param detail - The "detail" parameter is a string that represents the specific details or
         * description of the error. It provides additional information about the error that occurred.
         * @param transaccion - The "transaccion" parameter represents the transaction related to the error
         * record. It could be a unique identifier or any other information that helps identify the
         * transaction associated with the error.
         * @param proveedor - The "proveedor" parameter refers to the provider or supplier associated with
         * the error record.
         * @param recordDiot - The `recordDiot` parameter is the value that will be set for the "Historial
         * DIOT" field in the error record.
         * @returns The function `generateRecordError` returns an object with the following properties:
         */
        const generateRecordError = (type, detail, transaccion, proveedor, recordDiot) => {
            const response = { success: false, error: '', errorId: '' };
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
                log.audit({title:'RECORD_INFO.ERRORES_DIOT.FIELDS DBG',details:detail});
                
                response.errorId = recordId;
                response.success = true;
            } catch (error) {
                log.error({ title: 'generateRecordError', details: error });
                response.success = false;
                response.error = error;
            }
            return response;
        }

        /**
         * The function `getVendorBills` retrieves vendor bills based on specified filters and returns the
         * results.
         * @param recordPeriod - The recordPeriod parameter is the period or timeframe for which you want
         * to retrieve vendor bills. It could be a specific month, quarter, or year, depending on your
         * business requirements.
         * @param recordSubsidiary - The `recordSubsidiary` parameter is the ID of the subsidiary for which
         * you want to retrieve vendor bills.
         * @param recordID - The `recordID` parameter is the ID of the record that you want to retrieve
         * vendor bills for.
         * @param transacciones - The "transacciones" parameter is an array of transaction IDs. It is used
         * as a filter in the search to retrieve vendor bills that have one of the specified transaction
         * IDs.
         * @returns The function `getVendorBills` returns an object with the following properties:
         */
        const getVendorBills = (recordPeriod, recordSubsidiary, recordID, transacciones) => {
            const response = { success: false, error: '', quantityData: '', data: {}, generatedNewError:false };
            try {

                var vendorbillSearchObj = search.create({
                    type: RECORD_INFO.VENDOR_BILL_RECORD.ID,
                    filters:
                        [
                            ["type", "anyof", "VendBill"],
                            "AND",
                            ["mainline", "is", "T"],
                            "AND",
                            ["status", "anyof", "VendBill:B", "VendBill:A"],
                            "AND",
                            ["applyingtransaction", "noneof", "@NONE@"]
                            , "AND",
                            ["internalid", "anyof", transacciones]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "tranid", label: "Número de documento" }),
                            search.createColumn({ name: "internalid", label: "ID interno" }),
                            search.createColumn({ name: "statusref", label: "Estado" }),
                            search.createColumn({ name: "amount", label: "Importe" }),
                            // search.createColumn({name: "applyingtransaction", label: "Aplicación de transacción"}),
                            search.createColumn({ name: "custbody_fb_tipo_operacion", label: "Tipo de Operación" }),
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
                                name: "custentityfb_diot_numregidtrib",
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
                    vendorbillResult.pageRanges.forEach(function (pageRange) {
                        var myPage = vendorbillResult.fetch({ index: pageRange.index });
                        myPage.data.forEach(function (result) {
                            let vendorTipoTercero = result.getValue({ name: RECORD_INFO.VENDOR_RECORD.FIELDS.TIPO_TERCERO, join: RECORD_INFO.VENDOR_RECORD.ID });
                            let vendorId = result.getValue({ name: RECORD_INFO.VENDOR_RECORD.FIELDS.INTERNALID, join: RECORD_INFO.VENDOR_RECORD.ID });
                            let vendorTipoTercero_Text = result.getText({ name: RECORD_INFO.VENDOR_RECORD.FIELDS.TIPO_TERCERO, join: RECORD_INFO.VENDOR_RECORD.ID });
                            let vendorTipoTercero_Code = vendorTipoTercero_Text.split(' ');
                            vendorTipoTercero_Code = vendorTipoTercero_Code[0];
                            let vendorbillTipoOperacion = result.getValue({ name: RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TIPO_OPERACION });
                            let vendorbillTipoOperacion_Text = result.getText({ name: RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TIPO_OPERACION });
                            let vendorbillTipoOperacion_Code = vendorbillTipoOperacion_Text.split(' ');
                            vendorbillTipoOperacion_Code = vendorbillTipoOperacion_Code[0];
                            let vendorbillTranId = result.getValue({ name: RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TRANID });
                            let vendorbillInternalId = result.getValue({ name: RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.ID });
                            if (vendorTipoTercero) {
                                if (vendorbillTipoOperacion) {
                                    let vendorRFC = result.getValue({ name: RECORD_INFO.VENDOR_RECORD.FIELDS.RFC, join: RECORD_INFO.VENDOR_RECORD.ID });
                                    let vendorNombreExtranjero = result.getValue({ name: RECORD_INFO.VENDOR_RECORD.FIELDS.NOMBRE_EXTRANJERO, join: RECORD_INFO.VENDOR_RECORD.ID });
                                    let vendorPaisResidencia = result.getValue({ name: RECORD_INFO.VENDOR_RECORD.FIELDS.PAIS_RESIDENCIA, join: RECORD_INFO.VENDOR_RECORD.ID });
                                    let vendorPaisResidencia_Text = result.getText({ name: RECORD_INFO.VENDOR_RECORD.FIELDS.PAIS_RESIDENCIA, join: RECORD_INFO.VENDOR_RECORD.ID });
                                    let vendorPaisResidencia_Code = vendorPaisResidencia_Text.split(' ');
                                    vendorPaisResidencia_Code = vendorPaisResidencia_Code[0];
                                    let vendorNacionalidad = result.getValue({ name: RECORD_INFO.VENDOR_RECORD.FIELDS.NACIONALIDAD, join: RECORD_INFO.VENDOR_RECORD.ID });
                                    let vendorTaxId = result.getValue({ name: RECORD_INFO.VENDOR_RECORD.FIELDS.TAX_ID, join: RECORD_INFO.VENDOR_RECORD.ID });
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
                                            if (!vendorRFC) {
                                                0
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
                                            transaccionTranId: vendorbillTranId,
                                            transaccionInternalId: vendorbillInternalId,
                                            transaccionEstado: result.getValue({ name: 'statusref' }),
                                            transaccionImporte: result.getValue({ name: 'amount' }),
                                            // vendorbillTransaccionRelacionadaTipo: result.getValue({name: "type", join: "applyingTransaction"}),
                                            // vendorbillTransaccionRelacionadaId: result.getValue({name: 'applyingtransaction'}),
                                            transaccionTipoOperacion: vendorbillTipoOperacion,
                                            transaccionTipoOperacion_Text: vendorbillTipoOperacion_Text,
                                            transaccionTipoOperacion_Code: vendorbillTipoOperacion_Code,
                                            vendorId: result.getValue({ name: "internalid", join: "vendor" }),
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
                                } else {
                                    let errorObj = {
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
                            } else {
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
                        response.generatedNewError=true;
                    });
                    // log.debug({ title:'vendorbillFound_long', details:vendorbillFound.length });
                    // log.debug({ title:'vendorbillFound', details:vendorbillFound });
                    var vendorbillFoundClear = {};
                    vendorbillFound.forEach((element, index) => {
                        // log.debug({ title:'element: ' + index, details:element });
                        let identify = element.transaccionTranId + '_' + element.transaccionInternalId;
                        element.generatedNewError=response.generatedNewError;
                        // vendorbillFoundClear.generatedNewError=element.generatedNewError;
                        if (!vendorbillFoundClear.hasOwnProperty(identify)) {
                            vendorbillFoundClear[identify] = element;
                        }
                    });
                    // log.debug({ title:'vendorbillFoundClear', details:vendorbillFoundClear });
                    response.success = true;
                    response.quantityData = Object.keys(vendorbillFoundClear).length;
                    response.data = vendorbillFoundClear;
                } else { // si no hay facturas
                    let newError = generateError('ERROR DE PROCESAMIENTO', 'No se encontraron Facturas a reportar con los datos ingresados.', 'Error, la busqueda guardada regreso una cantidad de resultados cero.');
                    generateRecordError('ERROR DE PROCESAMIENTO', 'No se encontraron Facturas a reportar con los datos ingresados.', '', '', recordID);
                    throw newError;
                }
            } catch (error) {
                log.error({ title: 'getVendorBills', details: error });
                response.success = false;
                response.error = error;
            }
            log.audit({ title: 'response GETVENDORBILLS', details: response });
            return response;
        }

        /**
         * The function `getVendorBillTaxes` retrieves tax information from a vendor bill based on the
         * provided internal ID.
         * @param vendorbillInternalId - The internal ID of the vendor bill for which you want to retrieve
         * the taxes.
         * @param vendorId - The `vendorId` parameter is the ID of the vendor associated with the vendor
         * bill.
         * @param diotRecord - The `diotRecord` parameter is used to pass additional information related to
         * the DIOT (Declaración Informativa de Operaciones con Terceros) record. It is not used directly
         * in the `getVendorBillTaxes` function, but it is passed to the `generateRecord
         * @returns The function `getVendorBillTaxes` returns an object with the following properties:
         */
        const getVendorBillTaxes = (vendorbillInternalId, vendorId, diotRecord) => {
            const response = { success: false, error: '', data: [] };
            try {
                // log.debug({ title:'vendorbillInternalId', details:vendorbillInternalId });
                var vendorbillSearchObj = search.create({
                    type: "vendorbill",
                    filters:
                        [
                            ["mainline", "is", "F"],
                            "AND",
                            ["taxline", "is", "F"],
                            "AND",
                            ["internalid", "anyof", vendorbillInternalId]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "ID interno" }),
                            search.createColumn({ name: "item", label: "Artículo" }),
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
                    vendorbillResult.pageRanges.forEach(function (pageRange) {
                        var myPage = vendorbillResult.fetch({ index: pageRange.index });
                        var taxes = [];
                        myPage.data.forEach(function (result) {
                            let taxItem = result.getValue({ name: 'item' });
                            let taxBasis = result.getValue({ name: "taxbasis", join: "taxDetail" });
                            let taxCode = result.getValue({ name: "taxcode", join: "taxDetail" });
                            let taxType = result.getValue({ name: "taxtype", join: "taxDetail" });
                            let taxAmount = result.getValue({ name: "taxfxamount", join: "taxDetail" });
                            let taxRate = result.getValue({ name: "taxrate", join: "taxDetail" });
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
                } else {
                    let newError = generateError('ERROR NO IMPUESTOS', 'La factura no cuenta con impuestos registrados', 'La factura id: ' + vendorbillInternalId + ' no contiene impuestos.');
                    generateRecordError('ERROR NO IMPUESTOS', 'La factura no cuenta con impuestos registrados', vendorbillInternalId, vendorId, diotRecord);
                    throw newError;
                }
            } catch (error) {
                log.error({ title: 'getVendorBillTaxes', details: error });
                response.success = false;
                response.error = error;
            }
            return response;
        }

        /**
         * The function `getApllyPayments` retrieves vendor payments applied to a specific vendor bill.
         * @param vendorbillInternalId - The internal ID of the vendor bill for which you want to retrieve
         * the applied payments.
         * @param vendorId - The vendorId parameter is the ID of the vendor for which you want to retrieve
         * the applied payments.
         * @param diotRecord - The `diotRecord` parameter is used to identify a specific record in the DIOT
         * (Declaración Informativa de Operaciones con Terceros) system. It is likely used for logging or
         * tracking purposes within the function.
         * @param subsidiaria - The parameter "subsidiaria" refers to the subsidiary ID or internal ID of
         * the subsidiary for which you want to retrieve the vendor payments.
         * @param periodo - The "periodo" parameter represents the posting period for which the payments
         * are being searched. It is used as a filter in the search criteria to find vendor payments
         * applied to a specific vendor bill within the specified posting period.
         * @returns The function `getApllyPayments` returns an object with the following properties:
         */
        const getApllyPayments = (vendorbillInternalId, vendorId, diotRecord, subsidiaria, periodo) => {
            const response = { success: false, error: '', data: [] };
            try {
                var vendorpaymentSearchObj = search.create({
                    type: "vendorpayment",
                    filters:
                        [
                            ["type", "anyof", "VendPymt"],
                            "AND",
                            ["mainline", "is", "F"],
                            "AND",
                            ["subsidiary", "anyof", subsidiaria],
                            "AND",
                            ["postingperiod", "abs", periodo],
                            "AND",
                            ["appliedtotransaction.internalid", "anyof", vendorbillInternalId]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "ID interno" }),
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
                            search.createColumn({ name: "appliedtolinkamount", label: "Aplicado al vínculo importe" })
                        ]
                });
                var vendorbillResult = vendorpaymentSearchObj.runPaged({
                    pageSize: 1000
                });
                if (vendorbillResult.count > 0) {
                    vendorbillResult.pageRanges.forEach(function (pageRange) {
                        var myPage = vendorbillResult.fetch({ index: pageRange.index });
                        var payments = {};
                        myPage.data.forEach(function (result) {
                            let paymentId = result.getValue({ name: 'internalid' });
                            let transaccionId = result.getValue({ name: "internalid", join: "appliedToTransaction" });
                            let transaccionName = result.getValue({ name: "transactionname", join: "appliedToTransaction" });
                            let paymentAmountApply = 0;
                            paymentAmountApply = paymentAmountApply + Number(result.getValue({ name: "appliedtolinkamount" }));
                            // paymentAmountApply = (Number(paymentAmountApply));
                            // log.debug({ title:'paymentAmountApply', details:paymentAmountApply });
                            // log.debug({ title:'tipo de', details:typeof(paymentAmountApply) });
                            let paymentObj = {
                                paymentId: paymentId,
                                transaccionId: transaccionId,
                                transaccionName: transaccionName,
                                paymentAmountApply: paymentAmountApply
                            }
                            let identify = transaccionId + '_' + paymentId;
                            if (!payments.hasOwnProperty(identify)) {
                                payments[identify] = paymentObj;
                            } else {
                                payments[identify].paymentAmountApply = (payments[identify].paymentAmountApply * 1) + (paymentAmountApply * 1);
                            }
                        });
                        // log.debug({ title:'payments by: ' + vendorbillInternalId, details:payments });
                        response.data = payments;
                        response.success = true;
                    });
                } else {
                    let newError = generateError('ERROR NO PAGOS', 'La factura no cuenta con pagos registrados', 'La factura id: ' + vendorbillInternalId + ' no contiene pagos.');
                    generateRecordError('ERROR NO PAGOS', 'La factura no cuenta con pagos registrados', vendorbillInternalId, vendorId, diotRecord);
                    throw newError;
                }
            } catch (error) {
                log.error({ title: 'getApllyPayments', details: error });
                response.success = false;
                response.error = error;
            }
            return response;
        }

        /**
         * The `extractTaxes` function takes in an array of taxes and an array of values, and returns an
         * object containing the extracted taxes, their sums, and their rates.
         * @param impuestos - An array of objects representing different taxes. Each object has a "value"
         * property that represents the tax code.
         * @param values - The `values` parameter is an array of JSON strings representing invoices or
         * transactions. Each JSON string should have a `taxes` property, which is an array of tax objects.
         * @returns The function `extractTaxes` returns an object with the following properties:
         */
        const extractTaxes = (impuestos, values) => {
            const response = { success: false, error: '', data: [], dataClear: {} };
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
                            let hasDevolucion = tax.hasOwnProperty('isDevolucion');
                            let isDevolucion = false;
                            if (hasDevolucion == true) {
                                isDevolucion = tax.isDevolucion;
                            }
                            if (isDevolucion == false) {
                                if (tax.taxCode == element_impuesto.value) {
                                    // log.debug({ title:'tax found ' + index_tax, details:tax });
                                    impuestoRate = tax.taxRate;

                                    if ((factura.transaccionEstado != "open" && !factura.hasOwnProperty('isExpenseReport')) || (factura.transaccionEstado != 'approvedByAcct' && factura.hasOwnProperty('isExpenseReport')) || (factura.transaccionEstado != 'approvedByAcct' && factura.hasOwnProperty('isJournalEntry'))) {
                                        sumaImpuesto = (sumaImpuesto * 1) + (tax.taxBasis * 1);
                                    } else {
                                        let pagosObj = factura.payments;
                                        let pagosIds = Object.keys(pagosObj);
                                        let totalpagado = 0;
                                        pagosIds.forEach((element) => {
                                            let montoApply = pagosObj[element].paymentAmountApply;
                                            let paymentId = pagosObj[element].paymentId;
                                            // log.debug({ title:'datos extract', details:{montoApply: montoApply, paymentId: paymentId} });
                                            totalpagado = (totalpagado * 1) + (montoApply * 1);
                                        });
                                        totalpagado = totalpagado.toFixed(2);
                                        let equivalentePagado = ((totalpagado * 1) * (tax.taxBasis * 1)) / (factura.transaccionImporte * 1);
                                        equivalentePagado = equivalentePagado.toFixed(2);
                                        // log.debug({ title:'finales', details:{totalpagado: totalpagado, equivalentePagado: equivalentePagado} });
                                        sumaImpuesto = (sumaImpuesto * 1) + (equivalentePagado * 1);
                                    }
                                }
                            }
                        });
                    });
                    impuestosFound.push({ impuesto: element_impuesto, sumaImpuesto: sumaImpuesto, taxRate: impuestoRate });
                });
                response.data = impuestosFound;
                let impuestosFoundClear = {};
                impuestosFound.forEach((elemento, index) => {
                    if (elemento.taxRate) {
                        if (impuestosFoundClear.hasOwnProperty(elemento.taxRate)) {
                            impuestosFoundClear[elemento.taxRate]['total'] = impuestosFoundClear[elemento.taxRate].total + elemento.sumaImpuesto;
                            impuestosFoundClear[elemento.taxRate]['hijos'].push(elemento);
                        } else {
                            impuestosFoundClear[elemento.taxRate] = { total: 0, hijos: [] }
                            impuestosFoundClear[elemento.taxRate]['total'] = elemento.sumaImpuesto;
                            impuestosFoundClear[elemento.taxRate]['hijos'].push(elemento);
                        }
                    }
                });
                // log.debug({ title:'impuestosFoundClear', details:impuestosFoundClear });

                response.dataClear = impuestosFoundClear;
                response.success = true;
            } catch (error) {
                log.error({ title: 'extractTaxes', details: error });
                response.success = false;
                response.error = error;
            }
            return response;
        }

        /**
         * The `validateFolder` function checks if a folder exists and creates it if it doesn't, returning
         * the folder ID.
         * @param folderId - The ID of the folder that needs to be validated or created.
         * @param subsidiaria - The "subsidiaria" parameter represents the subsidiary for which the folder
         * needs to be validated. It is used to search for a folder specific to the subsidiary.
         * @param periodo - The "periodo" parameter represents a period or time frame. It is used to search
         * for or create a folder within the "subsidiariaFolder" based on the given period.
         * @returns The function `validateFolder` returns an object with the following properties:
         */
        const validateFolder = (folderId, subsidiaria, periodo) => {
            const response = { success: false, error: '', folderID: '' };
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
                } else { // ya existe folder
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
                } else { // ya existe folder
                    periodoFolder = periodoFolder_result.folderID;
                }
                if (periodoFolder) {
                    response.folderID = periodoFolder;
                } else {
                    response.folderID = folderId;
                }
                response.success = true;
            } catch (error) {
                log.error({ title: 'validateFolder', details: error });
                response.success = false;
                response.error = error;
            }
            return response
        }

        /**
         * The function `search_folder` searches for a folder with a specific name within a parent folder
         * and returns the folder's internal ID if found.
         * @param folderName - The name of the folder you want to search for.
         * @param parentFolder - The parent folder is the internal ID of the folder that contains the
         * folder you want to search for.
         * @returns The function `search_folder` returns an object with the following properties:
         */
        function search_folder(folderName, parentFolder) {
            const response = { success: false, error: '', folderID: -1 }
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
                            search.createColumn({ name: "name", label: "Name" }),
                            search.createColumn({ name: "foldersize", label: "Size (KB)" }),
                            search.createColumn({ name: "lastmodifieddate", label: "Last Modified" }),
                            search.createColumn({ name: "parent", label: "Sub of" }),
                            search.createColumn({ name: "numfiles", label: "# of Files" })
                        ]
                });
                const myPagedData = folderSearchVendor.runPaged({
                    pageSize: 1000
                });
                // log.debug("Resultados de folders",myPagedData.count);
                if (myPagedData.count > 0) { // obtener folder
                    myPagedData.pageRanges.forEach(function (pageRange) {
                        let myPage = myPagedData.fetch({ index: pageRange.index });
                        myPage.data.forEach(function (result) {
                            response.folderID = result.getValue({ name: 'internalid' });
                        });
                    });
                }
                response.success = true;
            } catch (error) {
                log.error({ title: 'search_folder', details: error });
                response.success = false;
                response.error = error;
            }
            return response;
        }

        /**
         * The function `create_folder` creates a new folder with a given name and parent folder in a
         * system, and returns a response object indicating the success or failure of the operation.
         * @param folderName - The name of the folder you want to create.
         * @param parentFolder - The parentFolder parameter is the ID of the parent folder where the new
         * folder will be created.
         * @returns an object with the following properties:
         */
        function create_folder(folderName, parentFolder) {
            const response = { success: false, error: '', folderID: -1 }
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
                log.error({ title: 'create_folder', details: error });
                response.success = false;
                response.error = error;
            }
            return response;
        }

        /**
         * The function `suma_impuestos` calculates the total sum of taxes from an object of taxes.
         * @param impuestos - The parameter `impuestos` is an object that contains various taxes. Each tax
         * is represented by a key-value pair, where the key is the tax ID and the value is an object that
         * contains information about the tax, including the total amount of the tax.
         * @returns The function `suma_impuestos` returns an object with the following properties:
         */
        function suma_impuestos(impuestos) {
            const response = { success: false, error: '', totalImpuestos: 0 };
            try {
                let impuestosIds = Object.keys(impuestos);
                let sumaImpuestos = 0;
                impuestosIds.forEach((element, index) => {
                    log.debug({ title: 'retencion: ' + index, details: element });
                    sumaImpuestos = (sumaImpuestos * 1) + (impuestos[element].total * 1);
                });
                sumaImpuestos = sumaImpuestos.toFixed(2);
                response.totalImpuestos = sumaImpuestos;
                response.success = true;
            } catch (error) {
                log.error({ title: 'suma_impuestos', details: error });
                response.success = false;
                response.error = error;
            }
            return response;
        }

        /**
         * The function `extract_devoluciones` extracts vendor credits based on specified filters and
         * calculates the total amount of devolutions.
         * @param subsidiaria - The "subsidiaria" parameter represents the subsidiary of the vendor credits
         * you want to extract. It is a reference to a specific subsidiary record in the system.
         * @param periodo - The "periodo" parameter represents the posting period of the transactions you
         * want to extract devoluciones (returns) from. It is a string value that should match the internal
         * ID of the posting period record in NetSuite.
         * @param proveedor - The parameter "proveedor" refers to the vendor or supplier from whom the
         * returns are being extracted.
         * @param tipoOperacion - The parameter "tipoOperacion" refers to the type of operation for which
         * you want to extract devoluciones (returns). It is used as a filter in the search criteria to
         * retrieve vendor credits with a specific tipoOperacion.
         * @param taxCodes - The "taxCodes" parameter is an array of tax codes. It is used to filter the
         * vendor credits based on the tax code associated with them. Only vendor credits with tax codes
         * that are present in the "taxCodes" array will be considered for further processing.
         * @param proveedorRFC - The parameter "proveedorRFC" is used to filter the vendor credits based on
         * the vendor's RFC (Registro Federal de Contribuyentes) in Mexico. It is an optional parameter, so
         * if it is provided, the function will include it in the search filters to narrow down the
         * results.
         * @returns The function `extract_devoluciones` returns an object with the following properties:
         */
        function extract_devoluciones(subsidiaria, periodo, proveedor, tipoOperacion, taxCodes, proveedorRFC) {
            const response = { success: false, error: '', totalDevoluciones: '' };
            try {
                // log.debug({ title:'extract_devoluciones_PARAMAS', details:{subsidiaria: subsidiaria, periodo: periodo, proveedor: proveedor, tipoOperacion: tipoOperacion} });
                // log.debug({ title:'taxCodes', details:taxCodes });
                let filters = [
                    ["type", "anyof", "VendCred"],
                    "AND",
                    ["subsidiary", "anyof", subsidiaria],
                    "AND",
                    ["postingperiod", "abs", periodo],
                    "AND",
                    ["custbody_fb_tipo_operacion", "anyof", tipoOperacion],
                    "AND",
                    ["taxline", "is", "F"],
                    "AND",
                    ["mainline", "is", "F"]
                ];
                if (proveedor) {
                    filters.push("AND");
                    filters.push(["vendor.internalid", "anyof", proveedor]);
                }
                if (proveedorRFC) {
                    filters.push("AND");
                    filters.push(["vendor.custentity_mx_rfc", "is", proveedorRFC]);
                }
                var vendorcreditSearchObj = search.create({
                    type: "vendorcredit",
                    filters: filters,
                    columns:
                        [
                            search.createColumn({
                                name: "internalid",
                                sort: search.Sort.ASC,
                                label: "ID interno"
                            }),
                            search.createColumn({ name: "tranid", label: "Número de documento" }),
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
                    myPagedData.pageRanges.forEach(function (pageRange) {
                        let myPage = myPagedData.fetch({ index: pageRange.index });
                        myPage.data.forEach(function (result) {
                            let taxCode = result.getValue({ name: "taxcode", join: "taxDetail" });
                            // log.debug({ title:'taxcode', details:taxCode });
                            if (taxCodes.indexOf(taxCode) != -1) {
                                let taxBasis = result.getValue({ name: "taxbasis", join: "taxDetail" });
                                response.totalDevoluciones = (response.totalDevoluciones * 1) + (taxBasis * 1);
                                response.totalDevoluciones = response.totalDevoluciones.toFixed(2);
                            }
                        });
                    });
                }
                response.success = true;
            } catch (error) {
                log.error({ title: 'extract_devoluciones', details: error });
                response.success = false;
                response.error = error;
            }
            return response;
        }

        /**
         * The function `send_email_status` sends an email to the owner of a record with the provided
         * recordId, informing them about the status of a DIOT report generation process.
         * @param recordId - The recordId parameter is the unique identifier of a record in the system. It
         * is used to retrieve information about the record and to send an email notification to the owner
         * of the record.
         * @returns an object with two properties: "success" and "error". The "success" property indicates
         * whether the email was sent successfully, and the "error" property contains any error message if
         * an error occurred during the process.
         */
        function send_email_status(recordId) {
            const response = { success: false, error: '' };
            try {
                log.debug({ title: 'sendMail', details: recordId });
                let sender = search.lookupFields({
                    type: RECORD_INFO.DIOT_RECORD.ID,
                    id: recordId,
                    columns: ['owner']
                });
                sender = sender.owner[0].value
                log.debug({ title: 'sender', details: sender });
                let receiver = search.lookupFields({
                    type: search.Type.EMPLOYEE,
                    id: sender,
                    columns: ['email']
                });
                receiver = receiver.email;
                log.debug({ title: 'receiver', details: receiver });
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

        /**
         * The function `getExpenseReport` retrieves expense report data based on specified parameters.
         * @param subsidiaria - The "subsidiaria" parameter represents the subsidiary for which the expense
         * report is being retrieved. It is used to filter the expense report search results based on the
         * subsidiary.
         * @param periodo - The "periodo" parameter represents the period for which the expense report is
         * being generated. It could be a specific month, quarter, or any other time period for which the
         * report is required.
         * @param recordID - The `recordID` parameter is the ID of the DIOT record. It is used to associate
         * the expense report data with the DIOT record.
         * @param transacciones - The "transacciones" parameter is an array of transaction IDs. These
         * transaction IDs are used as filters in the search to retrieve expense reports that match the
         * specified IDs.
         * @returns The function `getExpenseReport` returns an object with the following properties:
         */
        function getExpenseReport(subsidiaria, periodo, recordID, transacciones) {
            const response = { success: false, error: '', quantityData: 0, data: [] };
            try {
                // log.debug({ title:'ExpenseReport_Params', details:{subsidiaria: subsidiaria, periodo: periodo, recordID: recordID, transacciones: transacciones} });
                var expensereportSearchObj = search.create({
                    type: "expensereport",
                    filters:
                        [
                            ["type", "anyof", "ExpRept"],
                            "AND",
                            ["mainline", "is", "F"],
                            "AND",
                            ["taxline", "is", "F"],
                            "AND",
                            ["taxdetail.taxcode", "noneof", "@NONE@"],
                            "AND",
                            ["internalid", "anyof", transacciones]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "internalid",
                                sort: search.Sort.ASC,
                                label: "ID interno"
                            }),
                            search.createColumn({ name: "tranid", label: "Número de documento" }),
                            search.createColumn({ name: "statusref", label: "Estado" }),
                            search.createColumn({ name: "expensecategory", label: "Categoría de gastos" }),
                            search.createColumn({ name: "custcol_fb_proveedor", label: "Proveedor" }),
                            search.createColumn({ name: "custcol_fb_diot_prov_type", label: " Tipo de tercero" }),
                            search.createColumn({ name: "custcol_fb_diot_rfc_proveedot", label: "RFC Proveedor" }),
                            search.createColumn({ name: "custbody_fb_tipo_operacion", label: "Tipo de Operación" }),
                            search.createColumn({
                                name: "taxcode",
                                join: "taxDetail",
                                label: "Código de impuesto"
                            }),
                            search.createColumn({
                                name: "taxbasis",
                                join: "taxDetail",
                                label: "Base de impuesto (moneda extranjera)"
                            }),
                            search.createColumn({
                                name: "taxfxamount",
                                join: "taxDetail",
                                label: "Importe de impuestos (moneda extranjera)"
                            }),
                            search.createColumn({
                                name: "taxamount",
                                join: "taxDetail",
                                label: "Tax Amt"
                            }),
                            search.createColumn({
                                name: "taxrate",
                                join: "taxDetail",
                                label: "Tax Rate"
                            }),
                            search.createColumn({
                                name: "taxtype",
                                join: "taxDetail",
                                label: "Tipo de impuesto"
                            }),
                            search.createColumn({ name: "total", label: "Importe (total de transacción)" })
                        ]
                });
                var expenseReportResult = expensereportSearchObj.runPaged({
                    pageSize: 1000
                });
                if (expenseReportResult.count > 0) {
                    3
                    var expenseReportArray = [];
                    expenseReportResult.pageRanges.forEach(function (pageRange) {
                        var myPage = expenseReportResult.fetch({ index: pageRange.index });
                        myPage.data.forEach(function (result) {
                            let vendorId = result.getValue({ name: 'custcol_fb_proveedor' });
                            let vendorRFC = result.getValue({ name: 'custcol_fb_diot_rfc_proveedot' });
                            let vendorTipoTercero = result.getValue({ name: "custcol_fb_diot_prov_type" }) || 1;
                            let vendorTipoTercero_Text = result.getText({ name: "custcol_fb_diot_prov_type" }) || '04 - Proveedor Nacional';
                            let vendorTipoTercero_Code = vendorTipoTercero_Text.split(' ');
                            vendorTipoTercero_Code = vendorTipoTercero_Code[0];
                            let expenseReportTranId = result.getValue({ name: "tranid" });
                            let expenseReportInternalId = result.getValue({ name: "internalid" });
                            let expenseReportEstado = result.getValue({ name: 'statusref' });
                            let expenseReportImporte = result.getValue({ name: 'total' });
                            let expenseReportTipoOperacion = result.getValue({ name: "custbody_fb_tipo_operacion" }) || 3;
                            let expenseReportTipoOperacion_Text = result.getText({ name: "custbody_fb_tipo_operacion" }) || '85 - Otros';
                            let expenseReportTipoOperacion_Code = expenseReportTipoOperacion_Text.split(' ');
                            expenseReportTipoOperacion_Code = expenseReportTipoOperacion_Code[0];
                            let taxExpense = result.getValue({ name: 'expensecategory' });
                            let taxBasis = result.getValue({ name: "taxbasis", join: "taxDetail" });
                            let taxCode = result.getValue({ name: "taxcode", join: "taxDetail" });
                            let taxType = result.getValue({ name: "taxtype", join: "taxDetail" });
                            let taxAmount = result.getValue({ name: "taxamount", join: "taxDetail" });
                            let taxRate = result.getValue({ name: "taxrate", join: "taxDetail" });
                            let objTax = {
                                taxExpense: taxExpense,
                                taxBasis: taxBasis,
                                taxCode: taxCode,
                                taxType: taxType,
                                taxAmount: taxAmount,
                                taxRate: taxRate
                            }
                            // log.debug({ title:'objTax', details:objTax });

                            let expenseFound = expenseReportArray.findIndex((element) => element.vendorRFC == vendorRFC && element.transaccionTipoOperacion == expenseReportTipoOperacion);
                            if (expenseFound == -1) {
                                let objExpenseReport = {
                                    diotRecord: recordID,
                                    periodo: periodo,
                                    subsidiaria: subsidiaria,
                                    isExpenseReport: true,
                                    transaccionTranId: expenseReportTranId,
                                    transaccionInternalId: expenseReportInternalId,
                                    transaccionEstado: expenseReportEstado,
                                    transaccionImporte: expenseReportImporte,
                                    transaccionTipoOperacion: expenseReportTipoOperacion,
                                    transaccionTipoOperacion_Text: expenseReportTipoOperacion_Text,
                                    transaccionTipoOperacion_Code: expenseReportTipoOperacion_Code,
                                    vendorId: vendorId,
                                    vendorRFC: vendorRFC,
                                    vendorTaxId: '',
                                    vendorTipoTercero: vendorTipoTercero,
                                    vendorTipoTercero_Text: vendorTipoTercero_Text,
                                    vendorTipoTercero_Code: vendorTipoTercero_Code,
                                    vendorNombreExtranjero: '',
                                    vendorPaisResidencia: '',
                                    vendorPaisResidencia_Text: '',
                                    vendorPaisResidencia_Code: '',
                                    vendorNacionalidad: '',
                                    taxes: [objTax]
                                }
                                // log.debug({ title:'objExpenseReport', details:objExpenseReport });
                                expenseReportArray.push(objExpenseReport)
                            } else {
                                expenseReportArray[expenseFound].taxes.push(objTax);
                            }
                        });
                    });
                    // log.debug({ title:'expenseReportArray', details:expenseReportArray });
                    var expenseReportFoundClear = {};
                    expenseReportArray.forEach((element, index) => {
                        // log.debug({ title:'element: ' + index, details:element });
                        let identify = 'Expense' + '_' + element.transaccionInternalId + '_' + element.vendorRFC + '_' + element.transaccionTipoOperacion;
                        if (!expenseReportFoundClear.hasOwnProperty(identify)) {
                            expenseReportFoundClear[identify] = element;
                        }
                    });
                    response.success = true;
                    response.quantityData = Object.keys(expenseReportFoundClear).length;
                    response.data = expenseReportFoundClear
                } else {
                    response.success = true;
                }
            } catch (error) {
                log.error({ title: 'getExpenseReport', details: error });
                response.success = false;
                response.error = error;
            }
            return response;
        }

        /**
         * The function `getPaymentsPeriod` retrieves vendor payments for a specific subsidiary and posting
         * period in NetSuite.
         * @param subsidiaria - The "subsidiaria" parameter refers to the subsidiary of the vendor payments
         * you want to retrieve. It is used as a filter in the search query to only retrieve vendor
         * payments associated with the specified subsidiary.
         * @param periodo - The "periodo" parameter represents the posting period for which you want to
         * retrieve payments. It is a string value that should be in the format "YYYY-MM".
         * @returns an object that contains the payments found in the specified subsidiary and period. The
         * object has the following structure:
         */
        function getPaymentsPeriod(subsidiaria, periodo) {
            try {
                // log.debug({ title:'getPaymentsPeriod', details:{sub: subsidiaria, per: periodo} });
                var vendorpaymentSearchObj = search.create({
                    type: "vendorpayment",
                    filters:
                        [
                            ["type", "anyof", "VendPymt"],
                            "AND",
                            ["subsidiary", "anyof", subsidiaria],
                            "AND",
                            ["postingperiod", "abs", periodo],
                            "AND",
                            ["mainline", "is", "F"],
                            "AND",
                            ["taxline", "is", "F"]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "internalid",
                                sort: search.Sort.ASC,
                                label: "ID interno"
                            }),
                            search.createColumn({ name: "tranid", label: "Número de documento" }),
                            search.createColumn({ name: "appliedtotransaction", label: "Aplicado a la transacción" }),
                            search.createColumn({
                                name: "type",
                                join: "appliedToTransaction",
                                label: "Tipo"
                            })
                        ]
                });
                var vendorbillResult = vendorpaymentSearchObj.runPaged({
                    pageSize: 1000
                });
                if (vendorbillResult.count > 0) {
                    let paymentsFound = {};
                    vendorbillResult.pageRanges.forEach(function (pageRange) {
                        var myPage = vendorbillResult.fetch({ index: pageRange.index });
                        myPage.data.forEach(function (result) {
                            let internalId = result.getValue({ name: "internalid" });
                            let payTranId = result.getValue({ name: "tranid" });
                            let transactionApply = result.getValue({ name: "appliedtotransaction" });
                            let typeTransactionApply = result.getValue({ name: "type", join: "appliedToTransaction" });
                            // log.debug({ title:'dataFound', details:{internalId: internalId, tranid: payTranId, transactionApply: transactionApply, type: typeTransactionApply} });
                            if (typeTransactionApply == 'VendBill' || typeTransactionApply == 'ExpRept') { // Factura de proveedor
                                let prefijo = 'Payment_' + internalId;
                                if (transactionApply != '') {
                                    let allPayments = Object.keys(paymentsFound);
                                    if (allPayments.length > 0) {
                                        let indexFound = allPayments.findIndex((element) => element == prefijo);
                                        if (indexFound != -1) { // se encontro
                                            // if (transaccionIndex == -1) {
                                            if (typeTransactionApply == 'VendBill') {
                                                let transaccionIndex = paymentsFound[prefijo]['transacciones']['vendBill'].findIndex((element) => element == transactionApply);
                                                if (transaccionIndex == -1) {
                                                    paymentsFound[prefijo]['transacciones']['vendBill'].push(transactionApply);
                                                }
                                                // paymentsFound[prefijo] = {'pagoid': internalId, 'transacciones': {vendBill: [transactionApply], expRept: []}};
                                            }
                                            if (typeTransactionApply == 'ExpRept') {
                                                let transaccionIndex = paymentsFound[prefijo]['transacciones']['expRept'].findIndex((element) => element == transactionApply);
                                                if (transaccionIndex == -1) {
                                                    paymentsFound[prefijo]['transacciones']['expRept'].push(transactionApply);
                                                }
                                                // paymentsFound[prefijo] = {'pagoid': internalId, 'transacciones': {vendBill: [], expRept: [transactionApply]}};
                                            }
                                            // }
                                        } else {
                                            if (typeTransactionApply == 'VendBill') {
                                                paymentsFound[prefijo] = { 'pagoid': internalId, 'transacciones': { vendBill: [transactionApply], expRept: [] } };
                                            }
                                            if (typeTransactionApply == 'ExpRept') {
                                                paymentsFound[prefijo] = { 'pagoid': internalId, 'transacciones': { vendBill: [], expRept: [transactionApply] } };
                                            }
                                            // paymentsFound[prefijo] = {'pagoid': internalId, 'transacciones': [transactionApply]};
                                        }
                                    } else {
                                        if (typeTransactionApply == 'VendBill') {
                                            paymentsFound[prefijo] = { 'pagoid': internalId, 'transacciones': { vendBill: [transactionApply], expRept: [] } };
                                        }
                                        if (typeTransactionApply == 'ExpRept') {
                                            paymentsFound[prefijo] = { 'pagoid': internalId, 'transacciones': { vendBill: [], expRept: [transactionApply] } };
                                        }
                                    }
                                }
                            }
                        });
                    });
                    // log.debug({ title:'paymentsFound', details:paymentsFound });
                    return paymentsFound;
                } else {
                    throw 'No se tienen pagos en la subsidiaria y periodo indicado.'
                }
            } catch (error) {
                log.error({ title: 'getPaymentsPeriod', details: error });
                return [];
            }
        }

        /**
         * The function `extractVendorBill` extracts unique vendor bill numbers from a given object.
         * @param pagos - An object containing payment information.
         * @returns an array of vendor bill numbers.
         */
        function extractVendorBill(pagos) {
            try {
                // log.debug({ title:'pagos', details:pagos });
                let pagosKeys = Object.keys(pagos);
                let vendorBillFounds = [];
                // log.debug({ title:'pagosKeys', details:pagosKeys });
                pagosKeys.forEach((element, index) => {
                    // log.debug({ title:'pagos en ' + index, details:pagos[element] });
                    pagos[element].transacciones.vendBill.forEach((element, index) => {
                        // log.debug({ title:'factura', details:element});
                        let vendorBillFound = vendorBillFounds.indexOf(element);
                        if (vendorBillFound == -1) {
                            vendorBillFounds.push(element)
                        }
                    });
                });
                // log.debug({ title:'vendorBillFounds', details:vendorBillFounds });
                return vendorBillFounds;
            } catch (error) {
                log.error({ title: 'extractVendorBill', details: error });
                return [];
            }
        }

        /**
         * The function `extractExpenseReport` extracts unique expense reports from a given object.
         * @param pagos - The `pagos` parameter is an object that contains payment information. It has the
         * following structure:
         * @returns The function `extractExpenseReport` returns an object with three properties: `success`,
         * `error`, and `data`.
         */
        function extractExpenseReport(pagos) {
            const response = { success: false, error: '', data: [] }
            try {
                // log.debug({ title:'pagos', details:pagos });
                let pagosKeys = Object.keys(pagos);
                let expenseReportFounds = [];
                // log.debug({ title:'pagosKeys', details:pagosKeys });
                pagosKeys.forEach((element, index) => {
                    // log.debug({ title:'pagos en ' + index, details:pagos[element] });
                    pagos[element].transacciones.expRept.forEach((element, index) => {
                        // log.debug({ title:'factura', details:element});
                        let expenseReportFound = expenseReportFounds.indexOf(element);
                        if (expenseReportFound == -1) {
                            expenseReportFounds.push(element)
                        }
                    });
                });
                // log.debug({ title:'expenseReportFounds', details:expenseReportFounds });
                response.success = true;
                response.data = expenseReportFounds;
            } catch (error) {
                log.error({ title: 'extractExpenseReport', details: error });
                response.success = false;
                response.error = error;
            }
            return response;
        }

        /**
         * The function `extractJournalEntries` searches for journal entries in NetSuite based on specified
         * filters and returns the results.
         * @param subsidiaria - The "subsidiaria" parameter represents the subsidiary of the journal
         * entries you want to extract. It is used as a filter in the search criteria to retrieve journal
         * entries belonging to a specific subsidiary.
         * @param periodo - The "periodo" parameter represents the posting period for the journal entries.
         * It is used as a filter in the search to retrieve journal entries for a specific period.
         * @param recordID - The `recordID` parameter is used to specify the ID of the DIOT record. It is
         * used to associate the extracted journal entries with the DIOT record.
         * @returns The function `extractJournalEntries` returns an object with the following properties:
         */
        function extractJournalEntries(subsidiaria, periodo, recordID) {
            const response = { success: false, error: '', data: {} };
            try {
                log.debug({ title: 'extractJournalEntries_params', details: { subsidiaria: subsidiaria, periodo: periodo, recordID: recordID } });
                var journalentrySearchObj = search.create({
                    type: "journalentry",
                    filters:
                        [
                            ["subsidiary", "anyof", subsidiaria],
                            "AND",
                            ["postingperiod", "abs", periodo],
                            "AND",
                            ["type", "anyof", "Journal"],
                            "AND",
                            ["custcol_fb_diot_rfc_proveedot", "isnotempty", ""]
                            //    ,"AND", 
                            //    ["internalid","anyof","29931"]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "internalid",
                                sort: search.Sort.ASC,
                                label: "ID interno"
                            }),
                            search.createColumn({ name: "tranid", label: "Número de documento" }),
                            search.createColumn({ name: "account", label: "Cuenta" }),
                            search.createColumn({ name: "debitamount", label: "Importe (débito)" }),
                            search.createColumn({ name: "creditamount", label: "Importe (crédito)" }),
                            search.createColumn({ name: "taxamount", label: "Importe (impuestos)" }),
                            search.createColumn({ name: "custcol_fb_proveedor", label: "Proveedor" }),
                            search.createColumn({ name: "custcol_fb_diot_prov_type", label: " Tipo de tercero" }),
                            search.createColumn({ name: "custcol_fb_diot_rfc_proveedot", label: "RFC Proveedor" }),
                            search.createColumn({ name: "custcol_fb_diot_operation_type", label: "Tipo de operación" }),
                            search.createColumn({ name: "mainline", label: "*" }),
                            search.createColumn({
                                name: "taxcode",
                                join: "taxDetail",
                                label: "Código de impuesto"
                            }),
                            search.createColumn({
                                name: "taxamount",
                                join: "taxDetail",
                                label: "Tax Amt"
                            }),
                            search.createColumn({
                                name: "taxrate",
                                join: "taxDetail",
                                label: "Tax Rate"
                            }),
                            search.createColumn({
                                name: "taxtype",
                                join: "taxDetail",
                                label: "Tipo de impuesto"
                            })
                        ]
                });
                var journalEntriesResult = journalentrySearchObj.runPaged({
                    pageSize: 1000
                });
                log.debug({ title: 'journalEntriesResult.count', details: journalEntriesResult.count });
                if (journalEntriesResult.count > 0) {
                    let journalEntriesFound = [];
                    journalEntriesResult.pageRanges.forEach(function (pageRange) {
                        var myPage = journalEntriesResult.fetch({ index: pageRange.index });
                        myPage.data.forEach(function (result) {
                            let jeInternalId = result.getValue({ name: "internalid" });
                            let jeTranid = result.getValue({ name: 'tranid' });
                            let jeDebito = result.getValue({ name: 'debitamount' });
                            let jeCredito = result.getValue({ name: 'creditamount' });
                            let jeImpuestos = result.getValue({ name: 'taxamount' });
                            let vendorId = result.getValue({ name: 'custcol_fb_proveedor' }) || '';
                            let vendorRFC = result.getValue({ name: 'custcol_fb_diot_rfc_proveedot' }) || '';
                            let vendorTipoTercero = result.getValue({ name: 'custcol_fb_diot_prov_type' });
                            let vendorTipoTercero_text = result.getText({ name: 'custcol_fb_diot_prov_type' }) || '04 - Proveedor Nacional';
                            let vendorTipoTercero_Code = vendorTipoTercero_text.split(' ');
                            vendorTipoTercero_Code = vendorTipoTercero_Code[0];
                            let jeTipoOperacion = result.getValue({ name: 'custcol_fb_diot_operation_type' });
                            let jeTipoOperacion_text = result.getText({ name: 'custcol_fb_diot_operation_type' }) || '85 - Otros';
                            let jeTipoOperacion_Code = jeTipoOperacion_text.split(' ');
                            jeTipoOperacion_Code = jeTipoOperacion_Code[0];
                            let taxCode = result.getValue({ name: "taxcode", join: "taxDetail" });
                            let taxType = result.getValue({ name: "taxtype", join: "taxDetail" });
                            let taxAmount = result.getValue({ name: "taxamount", join: "taxDetail" });
                            let taxRate = result.getValue({ name: "taxrate", join: "taxDetail" });
                            let taxBasis;
                            let isDevolucion = false;
                            if (jeDebito) {
                                taxBasis = jeDebito;
                            } else {
                                isDevolucion = true;
                                taxBasis = jeImpuestos;
                            }
                            let taxObj = {
                                taxItem: '',
                                taxBasis: taxBasis,
                                taxCode: taxCode,
                                taxType: taxType,
                                taxAmount: taxAmount,
                                taxRate: taxRate,
                                transaccionDebito: jeDebito,
                                transaccionCredito: jeCredito,
                                transaccionImpuesto: jeImpuestos,
                                isDevolucion: isDevolucion
                            }
                            // log.debug({ title:'taxObj', details:taxObj });
                            let jeFound = journalEntriesFound.findIndex((element) => element.vendorRFC == vendorRFC && element.transaccionTipoOperacion == jeTipoOperacion);
                            if (jeFound == -1) {
                                let jeObj = {
                                    diotRecord: recordID,
                                    periodo: periodo,
                                    subsidiaria: subsidiaria,
                                    isJournalEntry: true,
                                    transaccionTranId: jeTranid,
                                    transaccionInternalId: jeInternalId,
                                    transaccionEstado: "paidInFull",
                                    transaccionImporte: 100,
                                    // transaccionDebito: jeDebito,
                                    // transaccionCredito: jeCredito,
                                    // transaccionImpuesto: jeImpuestos,
                                    transaccionTipoOperacion: jeTipoOperacion,
                                    transaccionTipoOperacion_Text: jeTipoOperacion_text,
                                    transaccionTipoOperacion_Code: jeTipoOperacion_Code,
                                    vendorId: vendorId,
                                    vendorRFC: vendorRFC,
                                    vendorTaxId: '',
                                    vendorTipoTercero: vendorTipoTercero,
                                    vendorTipoTercero_Text: vendorTipoTercero_text,
                                    vendorTipoTercero_Code: vendorTipoTercero_Code,
                                    vendorNombreExtranjero: '',
                                    vendorPaisResidencia: '',
                                    vendorPaisResidencia_Text: '',
                                    vendorPaisResidencia_Code: '',
                                    vendorNacionalidad: '',
                                    taxes: [taxObj],
                                    payments: {
                                        pago_imaginario: {
                                            paymentId: jeInternalId,
                                            vendorbillId: jeInternalId,
                                            vendorbillName: 'Pago Auxiliar',
                                            paymentAmountApply: 100
                                        }
                                    }
                                }
                                log.debug({ title: 'jeObj', details: jeObj });
                                journalEntriesFound.push(jeObj);
                            } else {
                                journalEntriesFound[jeFound].taxes.push(taxObj);
                            }
                        });
                    });
                    log.debug({ title: 'journalEntriesFound', details: journalEntriesFound });
                    var jeFoundClear = {};
                    journalEntriesFound.forEach((element, index) => {
                        // log.debug({ title:'element: ' + index, details:element });
                        let identify = 'JE' + '_' + element.transaccionInternalId + '_' + element.vendorRFC + '_' + element.transaccionTipoOperacion + '_' + element.vendorId;
                        if (!jeFoundClear.hasOwnProperty(identify)) {
                            jeFoundClear[identify] = element;
                        }
                    });
                    response.success = true;
                    response.data = jeFoundClear;
                } else {
                    response.success = true;
                }
            } catch (error) {
                log.error({ title: 'extractJournalEntries', details: error });
                response.success = false;
                response.error = error;
            }
            return response;
        }

        /**
         * The function `getJEDevoluciones` calculates the total tax basis for all transactions that have a
         * property `isJournalEntry` set to true and contain taxes with a property `isDevolucion` set to
         * true.
         * @param values - An array of JSON strings representing transactions. Each transaction object has
         * a property "isJournalEntry" and an array of taxes. Each tax object has a property "isDevolucion"
         * and "taxBasis".
         * @returns an object with the following properties:
         */
        function getJEDevoluciones(values) {
            const response = { success: false, error: '', total: 0 };
            try {
                // log.debug({ title:'values', details:values });
                values.forEach((element, index) => {
                    let transaccion = JSON.parse(element);
                    // log.debug({ title:'values_element: ' + index, details:transaccion });
                    if (transaccion.hasOwnProperty('isJournalEntry') == true) {
                        const taxes = transaccion.taxes;
                        // log.debug({ title:'taxes', details:taxes });
                        taxes.forEach((tax, tax_index) => {
                            // log.debug({ title:'tax: ' + tax_index, details:tax });
                            let hasDevolucion = tax.hasOwnProperty('isDevolucion');
                            if (hasDevolucion == true) {
                                let isDevolucion = tax.isDevolucion;
                                if (isDevolucion == true) {
                                    // log.debug({ title:'taxDevolucion: ' + tax_index, details:tax });
                                    response.total = (response.total * 1) + (tax.taxBasis * 1)
                                }
                            }
                        });
                    }
                });
                response.success = true;
            } catch (error) {
                log.error({ title: 'getJEDevoluciones', details: error });
                response.success = false;
                response.error = error;
            }
            return response;
        }

        return { getInputData, map, reduce, summarize };

    });
