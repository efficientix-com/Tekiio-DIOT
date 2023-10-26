/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/log', 'N/ui/serverWidget', 'N/search', 'N/task', 'N/runtime', '../../Lib/Enum/fb_diot_constants_lib', 'N/record', 'N/redirect', 'N/config'],
    /**
 * @param{log} log
 * @param{serverWidget} serverWidget
 */
    (log, serverWidget, search, task, runtime, values, record, redirect, config) => {

        const INTERFACE = values.INTERFACE;
        const RECORD_INFO = values.RECORD_INFO;
        const STATUS_LIST_DIOT = values.STATUS_LIST_DIOT;
        const SCRIPTS_INFO = values.SCRIPTS_INFO;
        const RUNTIME = values.RUNTIME;
        const COMPANY_INFORMATION = values.COMPANY_INFORMATION;

        //Cambio de nombre en el archivo

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            var request = scriptContext.request, response = scriptContext.response;
            var parameters = request.parameters;

            try {
                let form = createUI(parameters);
                response.writePage({
                    pageObject: form
                });

                switch(parameters.action){
                    case 'ejecuta':
                        generaDIOT(parameters);
                        break;
                }
            } catch (onRequestError) {
                log.error({ title: 'Error en onRequest', details: onRequestError })
            }
        }

        function createUI(parameters) {
            let form = serverWidget.createForm({
                title: INTERFACE.FORM.TITLE
            });
            form.clientScriptModulePath = '../UI_Events/fb_diot_cs';

            //Verificar si la empresa es one world
            var oneWorldFeature = runtime.isFeatureInEffect({ feature: RUNTIME.FEATURES.SUBSIDIARIES });
            var suitetax = runtime.isFeatureInEffect({ feature: RUNTIME.FEATURES.SUITETAX });
            log.debug('Caracteristicas', {oneWorldFeature: oneWorldFeature, suitetax: suitetax});
            log.debug({ title:'Interface', details:INTERFACE });
            var configEntorno = form.addField({
                id: INTERFACE.FORM.FIELDS.ENVIRONMENT.ID,
                type: serverWidget.FieldType.LONGTEXT,
                label: INTERFACE.FORM.FIELDS.ENVIRONMENT.LABEL
            });
            configEntorno.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            // Modificación de estilos
            var html_fld = form.addField({
                id: "custpage_html",
                label: "html",
                type: serverWidget.FieldType.INLINEHTML,
            });
            html_fld.defaultValue = '';
            html_fld.defaultValue+=`
                <script>
                document.getElementById("${INTERFACE.FORM.BUTTONS.GENERAR.ID}").style.setProperty('color', 'white', 'important');
                document.getElementById("${INTERFACE.FORM.BUTTONS.GENERAR.ID}").style.setProperty('background-color', '#42d078', 'important');
                document.getElementById("${INTERFACE.FORM.BUTTONS.GENERAR.ID}").style.setProperty('border', '1px solid #42d078', 'important');
                document.getElementById("tdbody_${INTERFACE.FORM.BUTTONS.GENERAR.ID}").style.setProperty('border', '1px solid #42d078', 'important');
                    document.getElementById("tdbody_${INTERFACE.FORM.BUTTONS.GENERAR.ID}").style.setProperty('border-radius', '3px', 'important');
                    document.getElementById("tdbody_${INTERFACE.FORM.BUTTONS.GENERAR.ID}").style.setProperty('box-shadow', '-1px 3px 20px -3px rgba(0,0,0,0.20)', 'important');
                </script>
            `;

            html_fld.defaultValue += '<script>';
            html_fld.defaultValue += 'console.log("User event is being triggered");';
            html_fld.defaultValue += `var listener4Events=document.querySelectorAll('.uir-header-buttons [id^="custpage"]');`;
            html_fld.defaultValue += "for(var i=0;i<listener4Events.length;i++){"

            html_fld.defaultValue += 'listener4Events[i].addEventListener("click", ()=>{';

            html_fld.defaultValue += 'var mascaraDialog=document.getElementsByTagName("body")[0];'
            html_fld.defaultValue += 'function cargarEstiloDialog(mutations){'
            html_fld.defaultValue += 'for(let mutationD of mutations){'
            html_fld.defaultValue += 'if(mutationD.type==="childList"){'
            html_fld.defaultValue += 'var addedNodeD= mutationD.addedNodes;'
            html_fld.defaultValue += 'console.log("Detectado de cambios",addedNodeD);'
            html_fld.defaultValue += 'for(var i=0;i<addedNodeD.length;i++){'

            html_fld.defaultValue += 'var addedNodeClassNameD= addedNodeD[i].className;'
            html_fld.defaultValue += 'console.log("ClassName",addedNodeClassNameD);'
            html_fld.defaultValue += 'if(addedNodeClassNameD=="x-window x-layer x-window-default x-border-box x-focus x-window-focus x-window-default-focus"){'

            html_fld.defaultValue += 'console.log("Dialog was triggered");'

            // Código de renderización de dialog
            html_fld.defaultValue += `var dialog=document.querySelector('[role="dialog"] .uir-message-header');`;
            html_fld.defaultValue += "if(dialog){"
            html_fld.defaultValue += `var dialogHeader=document.querySelector('[role="dialog"] .x-window-header-title-default');`;
            html_fld.defaultValue += `var dialogAll=document.querySelector('[role="dialog"].x-window-default');`;
            html_fld.defaultValue += `var dialogButton=document.querySelector('[role="dialog"] .uir-message-buttons button');`;
            html_fld.defaultValue += 'dialog.classList.remove("x-window-header-default");';
            html_fld.defaultValue += `dialog.style.backgroundColor='white';`;
            html_fld.defaultValue += "dialog.style.borderTop='10px solid #0077be';"
            html_fld.defaultValue += "dialog.style.borderRadius='3px';"

            html_fld.defaultValue += `dialogHeader.style.color='#0077be';`;


            html_fld.defaultValue += `dialogButton.style.backgroundColor='#0077be';`;
            html_fld.defaultValue += `dialogButton.style.color='white';`;
            html_fld.defaultValue += "dialogButton.style.border='2px solid #0077be';"

            html_fld.defaultValue += "dialogAll.style.borderRadius='3px';"

            html_fld.defaultValue += "}"
            // Fin de código de renderización de dialog

            html_fld.defaultValue += '}'
            html_fld.defaultValue += '}'
            html_fld.defaultValue += '}'
            html_fld.defaultValue += '}'
            html_fld.defaultValue += '}'
            html_fld.defaultValue += 'var observadorD=new MutationObserver(cargarEstiloDialog);'

            html_fld.defaultValue += 'observadorD.observe(mascaraDialog,{childList: true});'
            html_fld.defaultValue += '});';
            html_fld.defaultValue += '}';

            html_fld.defaultValue += '</script>';

            // Código de render de mensajes
            // Código de Observer
            html_fld.defaultValue += '<script>';
            html_fld.defaultValue += 'var mascara=document.getElementById("body");'

            html_fld.defaultValue += 'function defineTipoAlert(mutations){'
            html_fld.defaultValue += 'for(let mutation of mutations){'
            html_fld.defaultValue += 'if(mutation.type==="childList"){'
            html_fld.defaultValue += 'var addedNode= mutation.addedNodes;'
            html_fld.defaultValue += 'for(var i=0;i<addedNode.length;i++){'
            html_fld.defaultValue += 'var addedNodeClassName= addedNode[i].className;'
            html_fld.defaultValue += 'console.log("ClassName child nuevo:",addedNodeClassName);'
            html_fld.defaultValue += 'console.log("nuevo DE DIV__ALERT:",mutation.addedNodes);'
            html_fld.defaultValue += 'var prevClassName= mutation.previousSibling.className;'
            html_fld.defaultValue += 'var prevChild= mutation.previousSibling;'
            html_fld.defaultValue += 'console.log("ClassName child anterior:",prevClassName);'
            html_fld.defaultValue += 'if(addedNodeClassName.includes("error")){'
            // Inicia ERROR
            html_fld.defaultValue += "var cDiv = addedNode[0].children;"
            html_fld.defaultValue += "for (var inf = 0; inf < cDiv.length; inf++) {"
            html_fld.defaultValue += "if (cDiv[inf].tagName == 'DIV') { "
            html_fld.defaultValue += "var cDivChildren=cDiv[inf].children;"
            html_fld.defaultValue += "for (var j = 0; j < cDivChildren.length; j++) {"
            html_fld.defaultValue += "if (cDivChildren[j].tagName == 'DIV') { "
            html_fld.defaultValue += "cDivChildren[j].style.color = '#ac003e';"

            html_fld.defaultValue += "}"
            html_fld.defaultValue += "}"
            html_fld.defaultValue += "}"
            html_fld.defaultValue += " }"
            html_fld.defaultValue += "addedNode[0].style.background='white';"
            html_fld.defaultValue += "addedNode[0].style.borderTop='10px solid #ac003e';"
            html_fld.defaultValue += "addedNode[0].style.borderRadius='3px';"


            html_fld.defaultValue += '}'
            // Inicia CONFIRMATION SUCCESS
            html_fld.defaultValue += 'if(addedNodeClassName.includes("confirmation")){'
            html_fld.defaultValue += "var cDiv = addedNode[0].children;"
            html_fld.defaultValue += "for (var inf = 0; inf < cDiv.length; inf++) {"
            html_fld.defaultValue += "if (cDiv[inf].tagName == 'DIV') { "
            html_fld.defaultValue += "var cDivChildren=cDiv[inf].children;"
            html_fld.defaultValue += "for (var j = 0; j < cDivChildren.length; j++) {"
            html_fld.defaultValue += "if (cDivChildren[j].tagName == 'DIV') { "
            html_fld.defaultValue += "cDivChildren[j].style.color = '#52bf90';"

            html_fld.defaultValue += "}"
            html_fld.defaultValue += "}"
            html_fld.defaultValue += "}"
            html_fld.defaultValue += " }"
            html_fld.defaultValue += "addedNode[0].style.background='white';"
            html_fld.defaultValue += "addedNode[0].style.borderTop='10px solid #52bf90';"
            html_fld.defaultValue += "addedNode[0].style.borderRadius='3px';"

            html_fld.defaultValue += '}'
            // IniciaINFOOO
            html_fld.defaultValue += 'if(addedNodeClassName.includes("info")){'
            html_fld.defaultValue += "var cDiv = addedNode[0].children;"
            html_fld.defaultValue += "for (var inf = 0; inf < cDiv.length; inf++) {"
            html_fld.defaultValue += "if (cDiv[inf].tagName == 'DIV') { "
            html_fld.defaultValue += "var cDivChildren=cDiv[inf].children;"
            html_fld.defaultValue += "for (var j = 0; j < cDivChildren.length; j++) {"
            html_fld.defaultValue += "if (cDivChildren[j].tagName == 'DIV') { "
            html_fld.defaultValue += "cDivChildren[j].style.color = '#0077be';"

            html_fld.defaultValue += "}"
            html_fld.defaultValue += "}"
            html_fld.defaultValue += "}"
            html_fld.defaultValue += " }"
            html_fld.defaultValue += "addedNode[0].style.background='white';"
            html_fld.defaultValue += "addedNode[0].style.borderTop='10px solid #0077be';"
            html_fld.defaultValue += "addedNode[0].style.borderRadius='3px';"
            html_fld.defaultValue += '}'




            html_fld.defaultValue += '}'
            html_fld.defaultValue += '}'
            html_fld.defaultValue += '}'
            html_fld.defaultValue += '}'



            html_fld.defaultValue += 'function cargarFuncion(mutations){'
            html_fld.defaultValue += 'for(let mutation of mutations){'
            html_fld.defaultValue += 'if(mutation.type==="childList"){'
            html_fld.defaultValue += 'var addedNode= mutation.addedNodes;'
            html_fld.defaultValue += 'console.log("Detectado de cambios VIEW:",addedNode);'
            html_fld.defaultValue += 'for(var i=0;i<addedNode.length;i++){'

            html_fld.defaultValue += 'var addedNodeClassName= addedNode[i].id;'
            html_fld.defaultValue += 'console.log("ClassName",addedNodeClassName);'
            html_fld.defaultValue += 'if(addedNodeClassName==="div__alert"){'

            html_fld.defaultValue += 'console.log("Alert was triggered: ",addedNode);'
            // html_fld.defaultValue += 'var addedNodechild= addedNode[i].children;'
            // html_fld.defaultValue += 'console.log("Parent child",addedNodechild);';
            html_fld.defaultValue += 'var tipoAlert=document.getElementById("div__alert");'

            html_fld.defaultValue += 'var observadorTipo=new MutationObserver(defineTipoAlert);'

            html_fld.defaultValue += 'observadorTipo.observe(addedNode[i],{childList: true});'
            // Renderización de Messages
            html_fld.defaultValue += "var hideElement=document.getElementById('div__alert');";
            html_fld.defaultValue += "if(hideElement){"
            // Inicia caso de mensaje INFO
            // html_fld.defaultValue += `var infoMessage=document.querySelectorAll('#div__alert .uir-alert-box.info');`;
            html_fld.defaultValue += `var messageChild=addedNode[i].children;`;
            // inicio for de messageChild
            html_fld.defaultValue += 'for ( mc in messageChild){'
            html_fld.defaultValue += `var messageChildClassName=messageChild[0].className;`;
            html_fld.defaultValue += 'console.log("child className: ",messageChildClassName);'

            html_fld.defaultValue += "if(messageChildClassName){"
            html_fld.defaultValue += "if(messageChildClassName.includes('info')){"

            html_fld.defaultValue += "var cDiv = messageChild[0].children;"
            html_fld.defaultValue += "for (var inf = 0; inf < cDiv.length; inf++) {"
            html_fld.defaultValue += "if (cDiv[inf].tagName == 'DIV') { "
            html_fld.defaultValue += "var cDivChildren=cDiv[inf].children;"
            html_fld.defaultValue += "for (var j = 0; j < cDivChildren.length; j++) {"
            html_fld.defaultValue += "if (cDivChildren[j].tagName == 'DIV') { "
            html_fld.defaultValue += "cDivChildren[j].style.color = '#0077be';"

            html_fld.defaultValue += "}"
            html_fld.defaultValue += "}"
            html_fld.defaultValue += "}"
            html_fld.defaultValue += " }"
            html_fld.defaultValue += "messageChild[0].style.background='white';"
            html_fld.defaultValue += "messageChild[0].style.borderTop='10px solid #0077be';"
            html_fld.defaultValue += "messageChild[0].style.borderRadius='3px';"
            html_fld.defaultValue += "}"
            // Termina if de si incluye info




            // // // Inicia render de error
            html_fld.defaultValue += "if(messageChildClassName.includes('error')){"

            html_fld.defaultValue += "var cDiv = messageChild[0].children;"
            html_fld.defaultValue += "for (var inf = 0; inf < cDiv.length; inf++) {"
            html_fld.defaultValue += "if (cDiv[inf].tagName == 'DIV') { "
            html_fld.defaultValue += "var cDivChildren=cDiv[inf].children;"
            html_fld.defaultValue += "for (var j = 0; j < cDivChildren.length; j++) {"
            html_fld.defaultValue += "if (cDivChildren[j].tagName == 'DIV') { "
            html_fld.defaultValue += "cDivChildren[j].style.color = '#ac003e';"

            html_fld.defaultValue += "}"
            html_fld.defaultValue += "}"
            html_fld.defaultValue += "}"
            html_fld.defaultValue += " }"
            html_fld.defaultValue += "messageChild[0].style.background='white';"
            html_fld.defaultValue += "messageChild[0].style.borderTop='10px solid #ac003e';"
            html_fld.defaultValue += "messageChild[0].style.borderRadius='3px';"
            html_fld.defaultValue += "}"
            // // // Termina render de error
            // // Inicia render de success
            html_fld.defaultValue += "if(messageChildClassName.includes('confirmation')){"

            html_fld.defaultValue += "var cDiv = messageChild[0].children;"
            html_fld.defaultValue += "for (var inf = 0; inf < cDiv.length; inf++) {"
            html_fld.defaultValue += "if (cDiv[inf].tagName == 'DIV') { "
            html_fld.defaultValue += "var cDivChildren=cDiv[inf].children;"
            html_fld.defaultValue += "for (var j = 0; j < cDivChildren.length; j++) {"
            html_fld.defaultValue += "if (cDivChildren[j].tagName == 'DIV') { "
            html_fld.defaultValue += "cDivChildren[j].style.color = '#52bf90';"

            html_fld.defaultValue += "}"
            html_fld.defaultValue += "}"
            html_fld.defaultValue += "}"
            html_fld.defaultValue += " }"
            html_fld.defaultValue += "messageChild[0].style.background='white';"
            html_fld.defaultValue += "messageChild[0].style.borderTop='10px solid #52bf90';"
            html_fld.defaultValue += "messageChild[0].style.borderRadius='3px';"
            html_fld.defaultValue += "}"
            // Termina render de success



            html_fld.defaultValue += "}"
            // Fin de for de messageChild
            html_fld.defaultValue += "}"
            // Termina caso de mensaje INFO




            html_fld.defaultValue += "hideElement.style.paddingTop='20px'"
            html_fld.defaultValue += "}"


            html_fld.defaultValue += '}'
            html_fld.defaultValue += '}'
            html_fld.defaultValue += '}'
            html_fld.defaultValue += '}'
            html_fld.defaultValue += '}'
            html_fld.defaultValue += 'var observador=new MutationObserver(cargarFuncion);'

            html_fld.defaultValue += 'observador.observe(mascara,{childList: true});'

            html_fld.defaultValue += '</script>';
            // Finaliza Código de observer

            if (oneWorldFeature == true && suitetax == true) {
                try {
                    /**
                     * Creacion de los campos para los filtros de la DIOT
                     */
    
                    form.addButton({
                        id: INTERFACE.FORM.BUTTONS.GENERAR.ID,
                        label: INTERFACE.FORM.BUTTONS.GENERAR.LABEL,
                        functionName: INTERFACE.FORM.BUTTONS.GENERAR.FUNCTION + '(' + oneWorldFeature + ')'
                    });
                    log.debug( "parameters", parameters );
    
                    var fieldgroup_datos = form.addFieldGroup({
                        id : INTERFACE.FORM.FIELD_GROUP.DATOS.ID,
                        label : INTERFACE.FORM.FIELD_GROUP.DATOS.LABEL
                    });
    
                    /**
                     * Lista de subsidiarias
                     */
                    var subsidiaryList = form.addField({
                        id: INTERFACE.FORM.FIELDS.SUBSIDIARIA.ID,
                        type: serverWidget.FieldType.SELECT,
                        label: INTERFACE.FORM.FIELDS.SUBSIDIARIA.LABEL,
                        container: INTERFACE.FORM.FIELD_GROUP.DATOS.ID
                    });
    
                    if(oneWorldFeature){ //si es oneWorld hace la búsqueda de las subsidiarias
                        var subsis = searchSubsidiaries();
                        subsidiaryList.addSelectOption({ value: '', text: '' });
                        for (var sub = 0; sub < subsis.length; sub++) {
        
                            subsidiaryList.addSelectOption({
                                value: subsis[sub].id,
                                text: subsis[sub].name
                            });
                        }
                    }else{ //si no es oneWorld se bloquea el campo
                        subsidiaryList.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                    }
    
    
                    /**
                     * Lista de periodos
                     */
                    var periodList = form.addField({
                        id: INTERFACE.FORM.FIELDS.PERIODO.ID,
                        type: serverWidget.FieldType.SELECT,
                        label: INTERFACE.FORM.FIELDS.PERIODO.LABEL,
                        container: INTERFACE.FORM.FIELD_GROUP.DATOS.ID
                    });
    
                    var periods = searchAccountingPeriod();
                    periodList.addSelectOption({ value: '', text: '' });
                    for (var per = 0; per < periods.length; per++) {
    
                        periodList.addSelectOption({
                            value: periods[per].id,
                            text: periods[per].name
                        });
                    }
    
                } catch (UIError) {
                    log.error({ title: 'Error en createUI', details: UIError })
                }
            }else{
                let msg = ''
                if (oneWorldFeature == false) {
                    msg += 'Para utilizar el modulo es necesario que su instancia sea multi-subsidiarias, comuniquese con su administrador.\n';
                }
                if (suitetax == false) {
                    msg += 'Para utilizar el modulo es necesario que su instancia trabaje con SuiteTax, comuniquese con su administrador.';
                }
                configEntorno.defaultValue = msg;
            }
            return form;
        }

        function searchSubsidiaries() {
            try {
                var subsidiaries = []
                var subsiSearch = search.create({
                    type: RECORD_INFO.SUBSIDIARY_RECORD.ID,
                    filters:
                        [
                            [RECORD_INFO.SUBSIDIARY_RECORD.FIELDS.INACTIVE, search.Operator.IS, "F"]
                        ],
                    columns:
                        [
                            RECORD_INFO.SUBSIDIARY_RECORD.FIELDS.ID,
                            RECORD_INFO.SUBSIDIARY_RECORD.FIELDS.NAME
                        ]
                });
                subsiSearch.run().each(function (result) {
                    var id = result.getValue({ name: RECORD_INFO.SUBSIDIARY_RECORD.FIELDS.ID });
                    var name = result.getValue({ name: RECORD_INFO.SUBSIDIARY_RECORD.FIELDS.NAME });

                    subsidiaries.push({
                        id: id,
                        name: name
                    });
                    return true;
                });
            } catch (error) {
                log.error({ title: 'Error on searchSubsidiaries', details: error });
            }
            return subsidiaries;
        }

        function searchAccountingPeriod() {
            try {
                var periods = []
                var aPeriod = search.create({
                    type: RECORD_INFO.ACCOUNTINGPERIOD_RECORD.ID,
                    filters:
                    [
                        [RECORD_INFO.ACCOUNTINGPERIOD_RECORD.FIELDS.INACTIVE, search.Operator.IS, "F"]
                    ],
                    columns:
                    [
                        RECORD_INFO.ACCOUNTINGPERIOD_RECORD.FIELDS.ID,
                        RECORD_INFO.ACCOUNTINGPERIOD_RECORD.FIELDS.NAME,
                        search.createColumn({
                            name: RECORD_INFO.ACCOUNTINGPERIOD_RECORD.FIELDS.ID,
                            sort: search.Sort.DESC
                        })
                    ]
                });
                aPeriod.run().each(function (result) {
                    var id = result.getValue({ name: RECORD_INFO.ACCOUNTINGPERIOD_RECORD.FIELDS.ID });
                    var name = result.getValue({ name: RECORD_INFO.ACCOUNTINGPERIOD_RECORD.FIELDS.NAME });

                    periods.push({
                        id: id,
                        name: name
                    });

                    return true;
                });
            } catch (error) {
                log.error({ title: 'Error on searchAccountingPeriod', details: error });
            }
            return periods;
        }

        function generaDIOT(parameters) {
            try {
                log.debug({ title:'generaDIOT_parameters', details:parameters });
                const subsidiaria = parameters.subsidiaria;
                const periodo = parameters.periodo;
                var recordId_diot;
                if (parameters.origin) { // si se tiene que reprocesar el registro
                    recordId_diot = parameters.origin;
                }else{ // si se tiene que crear el registro
                    var oneWorldFeature = runtime.isFeatureInEffect({ feature: RUNTIME.FEATURES.SUBSIDIARIES });
    
                    //Se obtiene el nombre de la empresa
                    var companyInfo = config.load({
                        type: config.Type.COMPANY_INFORMATION
                    });
                    
                    compname = companyInfo.getValue({
                        fieldId: COMPANY_INFORMATION.FIELDS.ID
                    });
    
                    //Crear el registro
                    var customRecord_diot = record.create({
                        type: RECORD_INFO.DIOT_RECORD.ID,
                        isDynamic: true
                    });
    
                    if(oneWorldFeature){ //se pone el nombre de la subsidiaria
                        customRecord_diot.setValue({
                            fieldId: RECORD_INFO.DIOT_RECORD.FIELDS.SUBSIDIARY,
                            value: subsidiaria
                        });
                    }else{ //si no, se pone el nombre de la empresa
                        customRecord_diot.setValue({
                            fieldId: RECORD_INFO.DIOT_RECORD.FIELDS.SUBSIDIARY,
                            value: compname
                        });
                    }
    
                    customRecord_diot.setValue({
                        fieldId: RECORD_INFO.DIOT_RECORD.FIELDS.PERIOD,
                        value: periodo
                    });
    
                    customRecord_diot.setValue({
                        fieldId: RECORD_INFO.DIOT_RECORD.FIELDS.STATUS,
                        value: STATUS_LIST_DIOT.PENDING
                    });
    
                    recordId_diot = customRecord_diot.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });
                    log.audit({title: 'Company', details: compname });
                }
                log.audit({title: 'ID Record', details: recordId_diot});


                //redirigir al registro
                redirect.toRecord({
                    type: RECORD_INFO.DIOT_RECORD.ID,
                    id: recordId_diot
                });

                //creación del map reduce y envío de parametros
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: SCRIPTS_INFO.MAP_REDUCE.SCRIPT_ID,
                    deploymentId: SCRIPTS_INFO.MAP_REDUCE.DEPLOYMENT_ID,
                    params: {
                        [SCRIPTS_INFO.MAP_REDUCE.PARAMETERS.RECORD_DIOT_ID]: recordId_diot
                    }
                });
                var idTask = mrTask.submit();
                var otherId = record.submitFields({
                    type: RECORD_INFO.DIOT_RECORD.ID,
                    id: recordId_diot,
                    values: {
                        [RECORD_INFO.DIOT_RECORD.FIELDS.TASK_ID]: idTask
                    }
                });
                
                log.audit({ title: 'idTask', details: idTask });
            }catch (e) {
                var otherId = record.submitFields({
                    type: RECORD_INFO.DIOT_RECORD.ID,
                    id: recordId_diot,
                    values: {
                        [RECORD_INFO.DIOT_RECORD.FIELDS.STATUS]: STATUS_LIST_DIOT.ERROR,
                        [RECORD_INFO.DIOT_RECORD.FIELDS.ERROR]: e.message
                    }
                });
                log.debug({ title: "Error", details: e });
            }
        }

        return { onRequest }

    });
