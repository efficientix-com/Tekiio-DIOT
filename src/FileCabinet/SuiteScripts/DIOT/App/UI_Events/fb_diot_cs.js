/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/url', 'N/currentRecord', 'N/ui/message', 'N/search', '../../Lib/Enum/fb_diot_constants_lib'],

function(record, url, currentRecord, message, search, values) {

    const INTERFACE = values.INTERFACE;
    const SCRIPTS_INFO = values.SCRIPTS_INFO;
    const RECORD_INFO = values.RECORD_INFO;

    var periodo, subsidiaria;

    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
        let currentForm = scriptContext.currentRecord;
        let errorEntorno = currentForm.getValue({fieldId: INTERFACE.FORM.FIELDS.ENVIRONMENT.ID});
        if (errorEntorno != '') {
            console.error(errorEntorno);
            let msgEntorno = message.create({
                title: 'Error de entorno',
                message: errorEntorno,
                type: message.Type.ERROR
            });
            msgEntorno.show();
        }
    }


    function fieldChanged(scriptContext) {
        try {
            var currentForm = currentRecord.get();
            if ((scriptContext.fieldId == INTERFACE.FORM.FIELDS.SUBSIDIARIA.ID) || (scriptContext.fieldId == INTERFACE.FORM.FIELDS.PERIODO.ID)) {
                subsidiaria = currentForm.getValue({ fieldId: INTERFACE.FORM.FIELDS.SUBSIDIARIA.ID  });
                periodo = currentForm.getValue({ fieldId: INTERFACE.FORM.FIELDS.PERIODO.ID });
                
                console.log("Periodo", periodo);
                console.log("Subsidiaria", subsidiaria);

            }
        } catch (error) {
            console.error('error on fieldChange', error);
        }

    }

    function actualizarPantalla(){
        console.log('entra a funcin de actualizar');
        location.reload();
    }

    function generarReporte(oneWorld, origin){
        try {
            console.log('generaReporte_Params: ', {oneWorld: oneWorld, origin:origin});
            var peticionParams = {
                'action': 'ejecuta'
            };
            if (origin) {
                let dataLookUp = search.lookupFields({
                type: RECORD_INFO.DIOT_RECORD.ID,
                id: origin,
                columns: [RECORD_INFO.DIOT_RECORD.FIELDS.SUBSIDIARY, RECORD_INFO.DIOT_RECORD.FIELDS.PERIOD]
                });
                subsidiaria = dataLookUp[RECORD_INFO.DIOT_RECORD.FIELDS.SUBSIDIARY][0].value;
                console.log('sub: ' + subsidiaria);
                periodo = dataLookUp[RECORD_INFO.DIOT_RECORD.FIELDS.PERIOD][0].value;
                console.log('per: ' + periodo);
                peticionParams['origin'] = origin;
                let submitFields = record.submitFields({
                    type: RECORD_INFO.DIOT_RECORD.ID,
                    id: origin,
                    values: {
                        [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS] : 1
                    }
                });
            }
            peticionParams[SCRIPTS_INFO.SUITELET.PARAMETERS.PERIOD] = periodo;
            peticionParams[SCRIPTS_INFO.SUITELET.PARAMETERS.SUBSIDIARY] = subsidiaria;
            console.log('peticionParams', peticionParams);
            if(oneWorld){ //si es oneWorld validar el campo de periodo y subsidiaria
                if(periodo && subsidiaria) {
                    var msgbody = message.create({
                        type: message.Type.INFORMATION,
                        title: INTERFACE.FORM.FIELDS.MESSAGE.SUCCESS.TITLE,
                        message: INTERFACE.FORM.FIELDS.MESSAGE.SUCCESS.MESSAGE
                    });
                    var output = url.resolveScript({
                        scriptId: SCRIPTS_INFO.SUITELET.SCRIPT_ID,
                        deploymentId: SCRIPTS_INFO.SUITELET.DEPLOYMENT_ID,
                        params: peticionParams,
                        returnExternalUrl: false,
                    });
                    msgbody.show({ duration: 5000});
                    console.log(true);
                    window.open(output, '_self');
                }else {
                    var msgbody = message.create({
                        type: message.Type.ERROR,
                        title: INTERFACE.FORM.FIELDS.MESSAGE.ERROR.TITLE,
                        message: INTERFACE.FORM.FIELDS.MESSAGE.ERROR.MESSAGE
                    });
                    msgbody.show({ duration: 5000});
                    console.log(false);
                }
            }else{ //si no es oneWorld solo valida el campo de periodo
                if(periodo){
                    var msgbody = message.create({
                        type: message.Type.INFORMATION,
                        title: INTERFACE.FORM.FIELDS.MESSAGE.SUCCESS.TITLE,
                        message: INTERFACE.FORM.FIELDS.MESSAGE.SUCCESS.MESSAGE
                    });
                    var output = url.resolveScript({
                        scriptId: SCRIPTS_INFO.SUITELET.SCRIPT_ID,
                        deploymentId: SCRIPTS_INFO.SUITELET.DEPLOYMENT_ID,
                        params: peticionParams,
                        returnExternalUrl: false,
                    });
                    msgbody.show({ duration: 5000});
                    console.log(true);
                    window.open(output, '_self');
                }else{
                    var msgbody = message.create({
                        type: message.Type.ERROR,
                        title: INTERFACE.FORM.FIELDS.MESSAGE.ERROR.TITLE,
                        message: INTERFACE.FORM.FIELDS.MESSAGE.ERROR.MESSAGE
                    });
                    msgbody.show({ duration: 5000});
                    console.log(false);
                }
            }
        } catch (error) {
            console.error('generaReporte', error);
        }
    }
    

    return {
        pageInit: pageInit,
        actualizarPantalla:actualizarPantalla,
        generarReporte:generarReporte,
        fieldChanged: fieldChanged
    };

});