/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/runtime', 'N/task', 'N/search', '../../Lib/Enum/fb_diot_constants_lib', 'N/ui/serverWidget', 'N/redirect', 'N/https', 'N/url'],
    /**
 * @param{record} record
 * @param{runtime} runtime
 */
    (record, runtime, task, search, values, serverWidget, redirect, https, url) => {

        const INTERFACE = values.INTERFACE;
        const RECORD_INFO = values.RECORD_INFO;
        const SCRIPTS_INFO = values.SCRIPTS_INFO;
        const STATUS_LIST_DIOT = values.STATUS_LIST_DIOT;
        const RUNTIME = values.RUNTIME;

        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (context) => {
            try {
                var nRecord = context.newRecord;
                var taskId = nRecord.getValue({ fieldId: RECORD_INFO.DIOT_RECORD.FIELDS.TASK_ID });
                var record_type = nRecord.type;
                log.debug({ title: 'data IF', details: { tipo: context.type, record_type: record_type } });
                if (context.type == context.UserEventType.VIEW && record_type == RECORD_INFO.DIOT_RECORD.ID) {
                    var form = context.form;
                    const estado = parseInt(nRecord.getValue({ fieldId: RECORD_INFO.DIOT_RECORD.FIELDS.STATUS }));
                    const inactive = nRecord.getValue({ fieldId: RECORD_INFO.DIOT_RECORD.FIELDS.INACTIVE });
                    const recordID = nRecord.getValue({ fieldId: 'recordid' });
                    log.debug({ title: 'record', details: { recordID: recordID, estado: estado, inactive: inactive } });
                    if (inactive == false) {

                        // se agrega el CS para traer funciones de allá
                        form.clientScriptModulePath = "../UI_Events/fb_diot_cs";
                        var field_inject = form.addField({
                            id: 'custpage_field_injct',
                            type: serverWidget.FieldType.INLINEHTML,
                            label: 'Text'
                        });
                        field_inject.defaultValue = '';
                        field_inject.defaultValue += '<script>';
                        field_inject.defaultValue += 'console.log("User event is being triggered");';
                        field_inject.defaultValue += `var listener4Events=document.querySelectorAll('.uir-header-buttons [id^="custpage"]');`;
                        field_inject.defaultValue += "for(var i=0;i<listener4Events.length;i++){"

                        field_inject.defaultValue += 'listener4Events[i].addEventListener("click", ()=>{';

                        field_inject.defaultValue += 'var mascaraDialog=document.getElementsByTagName("body")[0];'
                        field_inject.defaultValue += 'function cargarEstiloDialog(mutations){'
                        field_inject.defaultValue += 'for(let mutationD of mutations){'
                        field_inject.defaultValue += 'if(mutationD.type==="childList"){'
                        field_inject.defaultValue += 'var addedNodeD= mutationD.addedNodes;'
                        field_inject.defaultValue += 'console.log("Detectado de cambios",addedNodeD);'
                        field_inject.defaultValue += 'for(var i=0;i<addedNodeD.length;i++){'

                        field_inject.defaultValue += 'var addedNodeClassNameD= addedNodeD[i].className;'
                        field_inject.defaultValue += 'console.log("ClassName",addedNodeClassNameD);'
                        field_inject.defaultValue += 'if(addedNodeClassNameD=="x-window x-layer x-window-default x-border-box x-focus x-window-focus x-window-default-focus"){'

                        field_inject.defaultValue += 'console.log("Dialog was triggered");'

                        // Código de renderización de dialog
                        field_inject.defaultValue += `var dialog=document.querySelector('[role="dialog"] .uir-message-header');`;
                        field_inject.defaultValue += "if(dialog){"
                        field_inject.defaultValue += `var dialogHeader=document.querySelector('[role="dialog"] .x-window-header-title-default');`;
                        field_inject.defaultValue += `var dialogAll=document.querySelector('[role="dialog"].x-window-default');`;
                        field_inject.defaultValue += `var dialogButton=document.querySelector('[role="dialog"] .uir-message-buttons button');`;
                        field_inject.defaultValue += 'dialog.classList.remove("x-window-header-default");';
                        field_inject.defaultValue += `dialog.style.backgroundColor='white';`;
                        field_inject.defaultValue += "dialog.style.borderTop='10px solid #0077be';"
                        field_inject.defaultValue += "dialog.style.borderRadius='3px';"

                        field_inject.defaultValue += `dialogHeader.style.color='#0077be';`;


                        field_inject.defaultValue += `dialogButton.style.backgroundColor='#0077be';`;
                        field_inject.defaultValue += `dialogButton.style.color='white';`;
                        field_inject.defaultValue += "dialogButton.style.border='2px solid #0077be';"

                        field_inject.defaultValue += "dialogAll.style.borderRadius='3px';"

                        field_inject.defaultValue += "}"
                        // Fin de código de renderización de dialog

                        field_inject.defaultValue += '}'
                        field_inject.defaultValue += '}'
                        field_inject.defaultValue += '}'
                        field_inject.defaultValue += '}'
                        field_inject.defaultValue += '}'
                        field_inject.defaultValue += 'var observadorD=new MutationObserver(cargarEstiloDialog);'

                        field_inject.defaultValue += 'observadorD.observe(mascaraDialog,{childList: true});'
                        field_inject.defaultValue += '});';
                        field_inject.defaultValue += '}';

                        field_inject.defaultValue += '</script>';

                        // Código de render de mensajes
                        // Código de Observer
                        field_inject.defaultValue += '<script>';
                        field_inject.defaultValue += 'var mascara=document.getElementById("body");'

                        field_inject.defaultValue += 'function defineTipoAlert(mutations){'
                        field_inject.defaultValue += 'for(let mutation of mutations){'
                        field_inject.defaultValue += 'if(mutation.type==="childList"){'
                        field_inject.defaultValue += 'var addedNode= mutation.addedNodes;'
                        field_inject.defaultValue += 'for(var i=0;i<addedNode.length;i++){'
                        field_inject.defaultValue += 'var addedNodeClassName= addedNode[i].className;'
                        field_inject.defaultValue += 'console.log("ClassName child nuevo:",addedNodeClassName);'
                        field_inject.defaultValue += 'console.log("nuevo DE DIV__ALERT:",mutation.addedNodes);'
                        field_inject.defaultValue += 'var prevClassName= mutation.previousSibling.className;'
                        field_inject.defaultValue += 'var prevChild= mutation.previousSibling;'
                        field_inject.defaultValue += 'console.log("ClassName child anterior:",prevClassName);'
                        field_inject.defaultValue += 'if(addedNodeClassName.includes("error")){'
                        // Inicia ERROR
                        field_inject.defaultValue += "var cDiv = addedNode[0].children;"
                        field_inject.defaultValue += "for (var inf = 0; inf < cDiv.length; inf++) {"
                        field_inject.defaultValue += "if (cDiv[inf].tagName == 'DIV') { "
                        field_inject.defaultValue += "var cDivChildren=cDiv[inf].children;"
                        field_inject.defaultValue += "for (var j = 0; j < cDivChildren.length; j++) {"
                        field_inject.defaultValue += "if (cDivChildren[j].tagName == 'DIV') { "
                        field_inject.defaultValue += "cDivChildren[j].style.color = '#ac003e';"

                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += " }"
                        field_inject.defaultValue += "addedNode[0].style.background='white';"
                        field_inject.defaultValue += "addedNode[0].style.borderTop='10px solid #ac003e';"
                        field_inject.defaultValue += "addedNode[0].style.borderRadius='3px';"


                        field_inject.defaultValue += '}'
                        // Inicia CONFIRMATION SUCCESS
                        field_inject.defaultValue += 'if(addedNodeClassName.includes("confirmation")){'
                        field_inject.defaultValue += "var cDiv = addedNode[0].children;"
                        field_inject.defaultValue += "for (var inf = 0; inf < cDiv.length; inf++) {"
                        field_inject.defaultValue += "if (cDiv[inf].tagName == 'DIV') { "
                        field_inject.defaultValue += "var cDivChildren=cDiv[inf].children;"
                        field_inject.defaultValue += "for (var j = 0; j < cDivChildren.length; j++) {"
                        field_inject.defaultValue += "if (cDivChildren[j].tagName == 'DIV') { "
                        field_inject.defaultValue += "cDivChildren[j].style.color = '#52bf90';"

                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += " }"
                        field_inject.defaultValue += "addedNode[0].style.background='white';"
                        field_inject.defaultValue += "addedNode[0].style.borderTop='10px solid #52bf90';"
                        field_inject.defaultValue += "addedNode[0].style.borderRadius='3px';"

                        field_inject.defaultValue += '}'
                        // IniciaINFOOO
                        field_inject.defaultValue += 'if(addedNodeClassName.includes("info")){'
                        field_inject.defaultValue += "var cDiv = addedNode[0].children;"
                        field_inject.defaultValue += "for (var inf = 0; inf < cDiv.length; inf++) {"
                        field_inject.defaultValue += "if (cDiv[inf].tagName == 'DIV') { "
                        field_inject.defaultValue += "var cDivChildren=cDiv[inf].children;"
                        field_inject.defaultValue += "for (var j = 0; j < cDivChildren.length; j++) {"
                        field_inject.defaultValue += "if (cDivChildren[j].tagName == 'DIV') { "
                        field_inject.defaultValue += "cDivChildren[j].style.color = '#0077be';"

                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += " }"
                        field_inject.defaultValue += "addedNode[0].style.background='white';"
                        field_inject.defaultValue += "addedNode[0].style.borderTop='10px solid #0077be';"
                        field_inject.defaultValue += "addedNode[0].style.borderRadius='3px';"
                        field_inject.defaultValue += '}'




                        field_inject.defaultValue += '}'
                        field_inject.defaultValue += '}'
                        field_inject.defaultValue += '}'
                        field_inject.defaultValue += '}'



                        field_inject.defaultValue += 'function cargarFuncion(mutations){'
                        field_inject.defaultValue += 'for(let mutation of mutations){'
                        field_inject.defaultValue += 'if(mutation.type==="childList"){'
                        field_inject.defaultValue += 'var addedNode= mutation.addedNodes;'
                        field_inject.defaultValue += 'console.log("Detectado de cambios VIEW:",addedNode);'
                        field_inject.defaultValue += 'for(var i=0;i<addedNode.length;i++){'

                        field_inject.defaultValue += 'var addedNodeClassName= addedNode[i].id;'
                        field_inject.defaultValue += 'console.log("ClassName",addedNodeClassName);'
                        field_inject.defaultValue += 'if(addedNodeClassName==="div__alert"){'

                        field_inject.defaultValue += 'console.log("Alert was triggered: ",addedNode);'
                        // field_inject.defaultValue += 'var addedNodechild= addedNode[i].children;'
                        // field_inject.defaultValue += 'console.log("Parent child",addedNodechild);';
                        field_inject.defaultValue += 'var tipoAlert=document.getElementById("div__alert");'

                        field_inject.defaultValue += 'var observadorTipo=new MutationObserver(defineTipoAlert);'

                        field_inject.defaultValue += 'observadorTipo.observe(addedNode[i],{childList: true});'
                        // Renderización de Messages
                        field_inject.defaultValue += "var hideElement=document.getElementById('div__alert');";
                        field_inject.defaultValue += "if(hideElement){"
                        // Inicia caso de mensaje INFO
                        // field_inject.defaultValue += `var infoMessage=document.querySelectorAll('#div__alert .uir-alert-box.info');`;
                        field_inject.defaultValue += `var messageChild=addedNode[i].children;`;
                        // inicio for de messageChild
                        field_inject.defaultValue += 'for ( mc in messageChild){'
                        field_inject.defaultValue += `var messageChildClassName=messageChild[0].className;`;
                        field_inject.defaultValue += 'console.log("child className: ",messageChildClassName);'

                        field_inject.defaultValue += "if(messageChildClassName){"
                        field_inject.defaultValue += "if(messageChildClassName.includes('info')){"

                        field_inject.defaultValue += "var cDiv = messageChild[0].children;"
                        field_inject.defaultValue += "for (var inf = 0; inf < cDiv.length; inf++) {"
                        field_inject.defaultValue += "if (cDiv[inf].tagName == 'DIV') { "
                        field_inject.defaultValue += "var cDivChildren=cDiv[inf].children;"
                        field_inject.defaultValue += "for (var j = 0; j < cDivChildren.length; j++) {"
                        field_inject.defaultValue += "if (cDivChildren[j].tagName == 'DIV') { "
                        field_inject.defaultValue += "cDivChildren[j].style.color = '#0077be';"

                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += " }"
                        field_inject.defaultValue += "messageChild[0].style.background='white';"
                        field_inject.defaultValue += "messageChild[0].style.borderTop='10px solid #0077be';"
                        field_inject.defaultValue += "messageChild[0].style.borderRadius='3px';"
                        field_inject.defaultValue += "}"
                        // Termina if de si incluye info




                        // // // Inicia render de error
                        field_inject.defaultValue += "if(messageChildClassName.includes('error')){"

                        field_inject.defaultValue += "var cDiv = messageChild[0].children;"
                        field_inject.defaultValue += "for (var inf = 0; inf < cDiv.length; inf++) {"
                        field_inject.defaultValue += "if (cDiv[inf].tagName == 'DIV') { "
                        field_inject.defaultValue += "var cDivChildren=cDiv[inf].children;"
                        field_inject.defaultValue += "for (var j = 0; j < cDivChildren.length; j++) {"
                        field_inject.defaultValue += "if (cDivChildren[j].tagName == 'DIV') { "
                        field_inject.defaultValue += "cDivChildren[j].style.color = '#ac003e';"

                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += " }"
                        field_inject.defaultValue += "messageChild[0].style.background='white';"
                        field_inject.defaultValue += "messageChild[0].style.borderTop='10px solid #ac003e';"
                        field_inject.defaultValue += "messageChild[0].style.borderRadius='3px';"
                        field_inject.defaultValue += "}"
                        // // // Termina render de error
                        // // Inicia render de success
                        field_inject.defaultValue += "if(messageChildClassName.includes('confirmation')){"

                        field_inject.defaultValue += "var cDiv = messageChild[0].children;"
                        field_inject.defaultValue += "for (var inf = 0; inf < cDiv.length; inf++) {"
                        field_inject.defaultValue += "if (cDiv[inf].tagName == 'DIV') { "
                        field_inject.defaultValue += "var cDivChildren=cDiv[inf].children;"
                        field_inject.defaultValue += "for (var j = 0; j < cDivChildren.length; j++) {"
                        field_inject.defaultValue += "if (cDivChildren[j].tagName == 'DIV') { "
                        field_inject.defaultValue += "cDivChildren[j].style.color = '#52bf90';"

                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += "}"
                        field_inject.defaultValue += " }"
                        field_inject.defaultValue += "messageChild[0].style.background='white';"
                        field_inject.defaultValue += "messageChild[0].style.borderTop='10px solid #52bf90';"
                        field_inject.defaultValue += "messageChild[0].style.borderRadius='3px';"
                        field_inject.defaultValue += "}"
                        // Termina render de success



                        field_inject.defaultValue += "}"
                        // Fin de for de messageChild
                        field_inject.defaultValue += "}"
                        // Termina caso de mensaje INFO




                        field_inject.defaultValue += "hideElement.style.paddingTop='20px'"
                        field_inject.defaultValue += "}"


                        field_inject.defaultValue += '}'
                        field_inject.defaultValue += '}'
                        field_inject.defaultValue += '}'
                        field_inject.defaultValue += '}'
                        field_inject.defaultValue += '}'
                        field_inject.defaultValue += 'var observador=new MutationObserver(cargarFuncion);'

                        field_inject.defaultValue += 'observador.observe(mascara,{childList: true});'

                        field_inject.defaultValue += '</script>';
                        // Finaliza Código de observer

                        //Se va calculando el porcentaje dependiendo la etapa en la que va del map reduce
                        if (estado === STATUS_LIST_DIOT.ERROR) { // registro en error o en pendiente
                            let oneWorldFeature = runtime.isFeatureInEffect({ feature: RUNTIME.FEATURES.SUBSIDIARIES });
                            form.addButton({
                                id: INTERFACE.FORM.BUTTONS.REGENERAR.ID,
                                label: INTERFACE.FORM.BUTTONS.REGENERAR.LABEL,
                                functionName: INTERFACE.FORM.BUTTONS.GENERAR.FUNCTION + '(' + oneWorldFeature + ', ' + recordID + ')'
                            });

                            field_inject.defaultValue += `
                            <style>
                                
                                div[data-walkthrough="Field:custrecord_fb_diot_mensaje"] .uir-field.inputreadonly.uir-resizable{
                                    color:#ac003e !important;
                                    font-weight:600 !important;

                                }
                                div[data-walkthrough="Field:custrecord_fb_estado_diot"] .uir-field.inputreadonly .inputreadonly{
                                    color:#ac003e !important;
                                    font-weight:600 !important;

                                }
                            </style>
                            <script>
                            document.getElementById("${INTERFACE.FORM.BUTTONS.REGENERAR.ID}").style.setProperty('color', 'white', 'important');
                            document.getElementById("${INTERFACE.FORM.BUTTONS.REGENERAR.ID}").style.setProperty('background-color', '#0077be', 'important');
                            document.getElementById("${INTERFACE.FORM.BUTTONS.REGENERAR.ID}").style.setProperty('border', '1px solid #0077be', 'important');
                            document.getElementById("tdbody_${INTERFACE.FORM.BUTTONS.REGENERAR.ID}").style.setProperty('border', '1px solid #0077be', 'important');
                                document.getElementById("tdbody_${INTERFACE.FORM.BUTTONS.REGENERAR.ID}").style.setProperty('border-radius', '3px', 'important');
                                document.getElementById("tdbody_${INTERFACE.FORM.BUTTONS.REGENERAR.ID}").style.setProperty('box-shadow', '-1px 3px 20px -3px rgba(0,0,0,0.20)', 'important');
                            </script>
                            
                            
                               
                            `;
                            // }else if (estado == STATUS_LIST_DIOT.COMPLETE) {
                            // form.removeButton({
                            //     id: INTERFACE.FORM.BUTTONS.EDITAR.ID
                            // });
                        } 
                        if (estado !== STATUS_LIST_DIOT.PARTIALLY_COMPLETE && estado !==STATUS_LIST_DIOT.COMPLETE && estado!==STATUS_LIST_DIOT.ERROR) { // procesando registro
                            // se agrega el boton de actualizar
                            form.addButton({
                                id: INTERFACE.FORM.BUTTONS.ACTUALIZAR.ID,
                                label: INTERFACE.FORM.BUTTONS.ACTUALIZAR.LABEL,
                                functionName: INTERFACE.FORM.BUTTONS.ACTUALIZAR.FUNCTION
                            });
                            updatePercent(taskId, nRecord);
                            field_inject.defaultValue += `
                            <style>
                            div[data-walkthrough="Field:custrecord_fb_estado_diot"] .uir-field.inputreadonly .inputreadonly{
                                    color:#e6700b !important;
                                    font-weight:600 !important;

                                }
                            </style>
                            <script>
                            document.getElementById("${INTERFACE.FORM.BUTTONS.ACTUALIZAR.ID}").style.setProperty('color', 'white', 'important');
                            document.getElementById("${INTERFACE.FORM.BUTTONS.ACTUALIZAR.ID}").style.setProperty('background-color', '#42d078', 'important');
                            document.getElementById("${INTERFACE.FORM.BUTTONS.ACTUALIZAR.ID}").style.setProperty('border', '1px solid #42d078', 'important');
                            document.getElementById("tdbody_${INTERFACE.FORM.BUTTONS.ACTUALIZAR.ID}").style.setProperty('border', '1px solid #42d078', 'important');
                                document.getElementById("tdbody_${INTERFACE.FORM.BUTTONS.ACTUALIZAR.ID}").style.setProperty('border-radius', '3px', 'important');
                                document.getElementById("tdbody_${INTERFACE.FORM.BUTTONS.ACTUALIZAR.ID}").style.setProperty('box-shadow', '-1px 3px 20px -3px rgba(0,0,0,0.20)', 'important');
                            </script>
                            `;

                            // se quita el boton de editar
                            form.removeButton({
                                id: INTERFACE.FORM.BUTTONS.EDITAR.ID
                            });
                        }
                        }
                        if (estado === STATUS_LIST_DIOT.PARTIALLY_COMPLETE) { // procesando registro
                            let oneWorldFeature = runtime.isFeatureInEffect({ feature: RUNTIME.FEATURES.SUBSIDIARIES });
                            form.addButton({
                                id: INTERFACE.FORM.BUTTONS.REGENERAR.ID,
                                label: INTERFACE.FORM.BUTTONS.REGENERAR.LABEL,
                                functionName: INTERFACE.FORM.BUTTONS.GENERAR.FUNCTION + '(' + oneWorldFeature + ', ' + recordID + ')'
                            });
                            updatePercent(taskId, nRecord);
                            field_inject.defaultValue += `
                            <style>
                            div[data-walkthrough="Field:custrecord_fb_diot_mensaje"] .uir-field.inputreadonly.uir-resizable{
                                color:#ff5506 !important;
                                font-weight:600 !important;

                            }
                            div[data-walkthrough="Field:custrecord_fb_estado_diot"] .uir-field.inputreadonly .inputreadonly{
                                    color:#ff5506 !important;
                                    font-weight:600 !important;

                                }
                            </style>
                            <script>
                            document.getElementById("${INTERFACE.FORM.BUTTONS.REGENERAR.ID}").style.setProperty('color', 'white', 'important');
                            document.getElementById("${INTERFACE.FORM.BUTTONS.REGENERAR.ID}").style.setProperty('background-color', '#0077be', 'important');
                            document.getElementById("${INTERFACE.FORM.BUTTONS.REGENERAR.ID}").style.setProperty('border', '1px solid #0077be', 'important');
                            document.getElementById("tdbody_${INTERFACE.FORM.BUTTONS.REGENERAR.ID}").style.setProperty('border', '1px solid #0077be', 'important');
                                document.getElementById("tdbody_${INTERFACE.FORM.BUTTONS.REGENERAR.ID}").style.setProperty('border-radius', '3px', 'important');
                                document.getElementById("tdbody_${INTERFACE.FORM.BUTTONS.REGENERAR.ID}").style.setProperty('box-shadow', '-1px 3px 20px -3px rgba(0,0,0,0.20)', 'important');
                            </script>
                            `;

                            // se quita el boton de editar
                            form.removeButton({
                                id: INTERFACE.FORM.BUTTONS.EDITAR.ID
                            });
                        }
                        
                        if(estado===STATUS_LIST_DIOT.COMPLETE){
                            // updatePercent(taskId, nRecord);
                            field_inject.defaultValue += `
                            <style>
                            div[data-walkthrough="Field:custrecord_fb_estado_diot"] .uir-field.inputreadonly .inputreadonly{
                                    color:#52bf90 !important;
                                    font-weight:600 !important;
                                }
                                div[data-walkthrough="Field:custrecord_fb_diot_mensaje"] .uir-field.inputreadonly.uir-resizable{
                                    color:#52bf90 !important;
                                    font-weight:600 !important;
    
                                }
                            </style>
                               
                            `;


                            form.removeButton({
                                id: INTERFACE.FORM.BUTTONS.EDITAR.ID
                            });
                        }
                    
                    }
                
                }
             catch (error) {
                log.error({ title: 'Error on beforeLoad', details: error });
            }

        }

        function updatePercent(taskId, nRecord) {
            try {
                var taskStatus = task.checkStatus({
                    taskId: taskId
                });
                var percent = 0;
                switch (taskStatus.stage) {
                    case task.MapReduceStage.GET_INPUT:
                        percent += 0;
                        break;
                    case task.MapReduceStage.MAP:
                        percent += 0;
                        break;
                    case task.MapReduceStage.SHUFFLE:
                        percent += 0;
                        break;
                    case task.MapReduceStage.REDUCE:
                        percent += 40;
                        break;
                    case task.MapReduceStage.SUMMARIZE:
                        percent += 80;
                        break;
                }
                var completion = taskStatus.getPercentageCompleted();
                if (!taskStatus.stage) {
                    percent = 0;
                    // percent = 100;
                }
                else {
                    percent += (completion * 20) / 100;
                }

                record.submitFields({
                    type: nRecord.type,
                    id: nRecord.id,
                    values: {
                        // [RECORD_INFO.DIOT_RECORD.FIELDS.PROGRESS]: completion+ '%'
                        [RECORD_INFO.DIOT_RECORD.FIELDS.PROGRESS]: Math.round(percent * 100) / 100 + '%'
                    }
                });

                return percent;

            }
            catch (e) {
                log.error("updatePercent e", e);
            }
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

        }

        return { beforeLoad, beforeSubmit, afterSubmit }

    });
