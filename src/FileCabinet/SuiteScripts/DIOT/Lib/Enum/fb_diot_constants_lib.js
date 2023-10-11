/**
 * @NApiVersion 2.1
 */

define([],function(){

    const FIELD_ID = {};

    const INTERFACE = {};

    INTERFACE.FORM = {};
    INTERFACE.FORM.TITLE = 'Reporte DIOT';

    INTERFACE.FORM.FIELDS = {};
    INTERFACE.FORM.FIELDS.SUBSIDIARIA = {};
    INTERFACE.FORM.FIELDS.SUBSIDIARIA.ID = 'custpage_subsi';
    INTERFACE.FORM.FIELDS.SUBSIDIARIA.LABEL = 'Subsidiaria';
    INTERFACE.FORM.FIELDS.ENVIRONMENT = {};
    INTERFACE.FORM.FIELDS.ENVIRONMENT.ID = 'custpage_environment';
    INTERFACE.FORM.FIELDS.ENVIRONMENT.LABEL = 'Entorno';
    INTERFACE.FORM.FIELDS.PERIODO = {};
    INTERFACE.FORM.FIELDS.PERIODO.ID = 'custpage_period';
    INTERFACE.FORM.FIELDS.PERIODO.LABEL = 'Periodo Contable';
    INTERFACE.FORM.FIELDS.MESSAGE = {};
    INTERFACE.FORM.FIELDS.MESSAGE.SUCCESS = {};
    INTERFACE.FORM.FIELDS.MESSAGE.SUCCESS.TITLE = 'Datos procesados';
    INTERFACE.FORM.FIELDS.MESSAGE.SUCCESS.MESSAGE = 'Se esta generando el reporte DIOT';
    INTERFACE.FORM.FIELDS.MESSAGE.ERROR = {};
    INTERFACE.FORM.FIELDS.MESSAGE.ERROR.TITLE = 'Datos incompletos';
    INTERFACE.FORM.FIELDS.MESSAGE.ERROR.MESSAGE = 'Asegurese de llenar todos los campos de la pantalla';

    INTERFACE.FORM.BUTTONS = {};
    INTERFACE.FORM.BUTTONS.GENERAR = {};
    INTERFACE.FORM.BUTTONS.GENERAR.ID = 'custpage_btn_generar_diot';
    INTERFACE.FORM.BUTTONS.GENERAR.LABEL = 'Generar';
    INTERFACE.FORM.BUTTONS.GENERAR.FUNCTION = 'generarReporte';
    INTERFACE.FORM.BUTTONS.ACTUALIZAR = {};
    INTERFACE.FORM.BUTTONS.ACTUALIZAR.ID = 'custpage_btn_reload_page';
    INTERFACE.FORM.BUTTONS.ACTUALIZAR.LABEL = 'Actualizar';
    INTERFACE.FORM.BUTTONS.ACTUALIZAR.FUNCTION = 'actualizarPantalla';
    INTERFACE.FORM.BUTTONS.REGENERAR = {};
    INTERFACE.FORM.BUTTONS.REGENERAR.ID = 'custpage_btn_regenera_diot';
    INTERFACE.FORM.BUTTONS.REGENERAR.LABEL = 'Regenerar';
    INTERFACE.FORM.BUTTONS.REGENERAR.FUNCTION = 'regenera';
    INTERFACE.FORM.BUTTONS.EDITAR = {};
    INTERFACE.FORM.BUTTONS.EDITAR.ID = 'edit';

    INTERFACE.FORM.FIELD_GROUP = {};
    INTERFACE.FORM.FIELD_GROUP.DATOS = {};
    INTERFACE.FORM.FIELD_GROUP.DATOS.ID = 'fieldgroupid_datos';
    INTERFACE.FORM.FIELD_GROUP.DATOS.LABEL = 'Datos'

    const RECORD_INFO = {};

    RECORD_INFO.SUBSIDIARY_RECORD = {};
    RECORD_INFO.SUBSIDIARY_RECORD.ID = 'subsidiary';
    RECORD_INFO.SUBSIDIARY_RECORD.FIELDS = {};
    RECORD_INFO.SUBSIDIARY_RECORD.FIELDS.INACTIVE = 'isinactive';
    RECORD_INFO.SUBSIDIARY_RECORD.FIELDS.ID = 'internalid';
    RECORD_INFO.SUBSIDIARY_RECORD.FIELDS.NAME = 'name';
    RECORD_INFO.SUBSIDIARY_RECORD.FIELDS.NAME_NOHIERARCHY = 'namenohierarchy';

    RECORD_INFO.ACCOUNTINGPERIOD_RECORD = {};
    RECORD_INFO.ACCOUNTINGPERIOD_RECORD.ID = 'accountingperiod';
    RECORD_INFO.ACCOUNTINGPERIOD_RECORD.FIELDS = {};
    RECORD_INFO.ACCOUNTINGPERIOD_RECORD.FIELDS.INACTIVE = 'isinactive';
    RECORD_INFO.ACCOUNTINGPERIOD_RECORD.FIELDS.ID = 'internalid';
    RECORD_INFO.ACCOUNTINGPERIOD_RECORD.FIELDS.NAME = 'periodname';

    RECORD_INFO.VENDOR_RECORD = {};
    RECORD_INFO.VENDOR_RECORD.ID = 'vendor'
    RECORD_INFO.VENDOR_RECORD.FIELDS = {};
    RECORD_INFO.VENDOR_RECORD.FIELDS.INTERNALID = 'internalid';
    RECORD_INFO.VENDOR_RECORD.FIELDS.NAME = 'companyname';
    RECORD_INFO.VENDOR_RECORD.FIELDS.RFC = 'custentity_mx_rfc';
    RECORD_INFO.VENDOR_RECORD.FIELDS.TAX_ID = 'custentity_efx_fe_numregidtrib';
    RECORD_INFO.VENDOR_RECORD.FIELDS.NOMBRE_EXTRANJERO = 'custentity_fb_nombre_extranjero';
    RECORD_INFO.VENDOR_RECORD.FIELDS.PAIS_RESIDENCIA = 'custentity_fb_pais_residencia';
    RECORD_INFO.VENDOR_RECORD.FIELDS.NACIONALIDAD = 'custentity_fb_nacionalidad';
    RECORD_INFO.VENDOR_RECORD.FIELDS.TIPO_TERCERO = 'custentity_fb_diot_prov_type';

    RECORD_INFO.SALES_TAX_RECORD = {};
    RECORD_INFO.SALES_TAX_RECORD.FIELDS = {};
    RECORD_INFO.SALES_TAX_RECORD.FIELDS.SUITETAX = {};
    RECORD_INFO.SALES_TAX_RECORD.FIELDS.SUITETAX.TAX_RATE = 'custrecord_ste_taxcode_taxrate';
    RECORD_INFO.SALES_TAX_RECORD.FIELDS.SUITETAX.TAX_CODE = 'name';
    RECORD_INFO.SALES_TAX_RECORD.FIELDS.SUITETAX.TAX_TYPE = 'taxtype';
    RECORD_INFO.SALES_TAX_RECORD.FIELDS.SUITETAX.RECEIVABLES_ACCOUNT = 'custrecord_ste_taxcode_receivablesacc';
    RECORD_INFO.SALES_TAX_RECORD.FIELDS.SUITETAX.PAYABLES_ACCOUNT = 'custrecord_ste_taxcode_payablesacc';
    RECORD_INFO.SALES_TAX_RECORD.FIELDS.LEGACY = {};
    RECORD_INFO.SALES_TAX_RECORD.FIELDS.LEGACY.TAX_RATE = 'rate';
    RECORD_INFO.SALES_TAX_RECORD.FIELDS.LEGACY.TAX_CODE = 'itemid';
    RECORD_INFO.SALES_TAX_RECORD.FIELDS.LEGACY.TAX_TYPE = 'taxtype';
    RECORD_INFO.SALES_TAX_RECORD.FIELDS.LEGACY.PURCHASE_ACCOUNT = 'acct1';
    RECORD_INFO.SALES_TAX_RECORD.FIELDS.LEGACY.SALE_ACCOUNT = 'acct2';

    RECORD_INFO.VENDOR_BILL_RECORD = {};
    RECORD_INFO.VENDOR_BILL_RECORD.ID = 'vendorbill';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS = {};
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.ID = 'internalid';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TRANID = 'tranid';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.ENTITY = 'entityid';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.NAME = 'name';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.VENDOR = 'vendor';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TYPE = 'type';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.VOIDED = 'voided';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.STATUS = 'status';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.PERIOD = 'postingperiod';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.SUBSIDIARY = 'subsidiary';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TAXLINE = 'taxline';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.MAINLINE = 'mainline';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TIPO_TERCERO = 'custentity_fb_diot_prov_type';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TIPO_OPERACION = 'custbody_fb_tipo_operacion'; 
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.AMOUNT = 'amount';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.NET_AMOUNT = 'netamount';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.NET_AMOUNT_NOTAX = 'netamountnotax';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TAX_AMOUNT = 'taxamount';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TAX_TOTAL = 'taxtotal';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TAX_BASIS = 'taxbasis';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TOTAL = 'total';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TAX_CODE = 'taxcode';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TAX_TYPE = 'taxtype';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TAX_RATE = 'taxrate';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TAX_ITEM = 'taxItem';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TAX_DETAIL = 'taxDetail';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.RFC = 'custentity_mx_rfc';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.TAX_ID = 'custentity_efx_fe_numregidtrib';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.NOMBRE_EXTRANJERO = 'custentity_fb_nombre_extranjero';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.PAIS_RESIDENCIA = 'custentity_fb_pais_residencia';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.NACIONALIDAD = 'custentity_fb_nacionalidad';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.IMPORTACION = 'custbody_fb_diot_importacion';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.FILTER = {};
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.FILTER.TIPO_TERCERO = 'vendor.custentity_fb_diot_prov_type';
    RECORD_INFO.VENDOR_BILL_RECORD.FIELDS.SUITETAX = {};

    RECORD_INFO.EXPENSE_REPORT_RECORD = {};
    RECORD_INFO.EXPENSE_REPORT_RECORD.ID = 'expensereport';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS ={};
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.ID = 'internalid';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.ENTITY = 'entityid';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.TYPE = 'type';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.VOIDED = 'voided';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.MAINLINE = 'mainline';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.STATUS = 'status';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.PERIOD = 'postingperiod';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.SUBSIDIARY = 'subsidiary';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.TAXLINE = 'taxline';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.NET_AMOUNT = 'netamount';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.NET_AMOUNT_NOTAX = 'netamountnotax';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.TAX_AMOUNT = 'taxamount';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.TAX_CODE = 'taxcode';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.TAX_TYPE = 'taxtype';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.TAX_RATE = 'taxrate';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.TAX_DETAIL = 'taxDetail';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.TIPO_TERCERO = 'custcol_fb_diot_prov_type';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.TIPO_OPERACION = 'custcol_fb_diot_operation_type';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.PROVEEDOR = 'custcol_fb_proveedor';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.IMPORTACION = 'custcol_fb_diot_importacion';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.RFC = 'custentity_mx_rfc';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.TAX_ID = 'custentity_efx_fe_numregidtrib';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.NOMBRE_EXTRANJERO = 'custentity_fb_nombre_extranjero';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.PAIS_RESIDENCIA = 'custentity_fb_pais_residencia';
    RECORD_INFO.EXPENSE_REPORT_RECORD.FIELDS.NACIONALIDAD = 'custentity_fb_nacionalidad';

    RECORD_INFO.JOURNAL_ENTRY_RECORD = {};
    RECORD_INFO.JOURNAL_ENTRY_RECORD.ID = 'journalentry';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS = {};
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.ID = 'internalid';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.ENTITY = 'entityid';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.NAME = 'name';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.TYPE = 'type';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.VOIDED = 'voided';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.STATUS = 'status';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.PERIOD = 'postingperiod';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.SUBSIDIARY = 'subsidiary';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.TAXLINE = 'taxline';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.MAINLINE = 'mainline';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.ACCOUNT = 'account';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.NET_AMOUNT = 'netamount';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.NET_AMOUNT_NOTAX = 'netamountnotax';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.TAX_ITEM = 'taxItem';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.TAX_TOTAL = 'taxtotal';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.TAX_AMOUNT = 'taxamount';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.TIPO_TERCERO = 'custcol_fb_diot_prov_type';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.TIPO_OPERACION = 'custcol_fb_diot_operation_type';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.PROVEEDOR = 'custcol_fb_proveedor';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.IMPORTACION = 'custcol_fb_diot_importacion';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.RFC = 'custentity_mx_rfc';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.TAX_ID = 'custentity_efx_fe_numregidtrib';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.NOMBRE_EXTRANJERO = 'custentity_fb_nombre_extranjero';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.PAIS_RESIDENCIA = 'custentity_fb_pais_residencia';
    RECORD_INFO.JOURNAL_ENTRY_RECORD.FIELDS.NACIONALIDAD = 'custentity_fb_nacionalidad';

    RECORD_INFO.VENDOR_CREDIT_RECORD = {};
    RECORD_INFO.VENDOR_CREDIT_RECORD.ID = 'vendorcredit';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS = {};
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.ID = 'internalid';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.TYPE = 'type';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.VOIDED = 'voided';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.ENTITY = 'entity';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.TAX_TOTAL = 'taxtotal';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.TOTAL = 'total';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.TAX_CODE = 'taxcode';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.TAX_TYPE = 'taxtype';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.TAX_RATE = 'taxrate';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.TAX_DETAIL = 'taxDetail';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.TRANSACTION = 'appliedToTransaction';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.TAXLINE = 'taxline';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.MAINLINE = 'mainline';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.NET_AMOUNT_NOTAX = 'netamountnotax';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.TAX_AMOUNT = 'taxamount';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.TAX_TOTAL = 'taxtotal';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.PROVEEDOR = 'vendor';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.TIPO_TERCERO = 'custentity_fb_diot_prov_type';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.FILTER = {};
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.FILTER.PROVEEDOR = 'vendor.internalid';
    RECORD_INFO.VENDOR_CREDIT_RECORD.FIELDS.FILTER.TRANSACTION = 'appliedtotransaction.internalid';

    RECORD_INFO.SALES_TAX_ITEM_RECORD = {};
    RECORD_INFO.SALES_TAX_ITEM_RECORD.ID = 'salestaxitem';
    RECORD_INFO.SALES_TAX_ITEM_RECORD.FIELDS = {};
    RECORD_INFO.SALES_TAX_ITEM_RECORD.FIELDS.ID = 'internalid';
    RECORD_INFO.SALES_TAX_ITEM_RECORD.FIELDS.NAME = 'name';
    RECORD_INFO.SALES_TAX_ITEM_RECORD.FIELDS.RATE = 'rate';
    RECORD_INFO.SALES_TAX_ITEM_RECORD.FIELDS.TAX_TYPE = 'taxType';
    RECORD_INFO.SALES_TAX_ITEM_RECORD.FIELDS.RECEIVABLES_ACCOUNT = 'receivablesaccount';
    RECORD_INFO.SALES_TAX_ITEM_RECORD.FIELDS.PAYABLES_ACCOUNT = 'payablesaccount';
    RECORD_INFO.SALES_TAX_ITEM_RECORD.FIELDS.PURCHASE_ACCOUNT = 'purchaseaccount';
    RECORD_INFO.SALES_TAX_ITEM_RECORD.FIELDS.SALE_ACCOUNT = 'saleaccount';
    RECORD_INFO.SALES_TAX_ITEM_RECORD.FIELDS.COUNTRY = 'country';

    RECORD_INFO.FOLDER_RECORD = {};
    RECORD_INFO.FOLDER_RECORD.ID = 'folder';
    RECORD_INFO.FOLDER_RECORD.FIELDS = {};
    RECORD_INFO.FOLDER_RECORD.FIELDS.ID = 'internalid';
    RECORD_INFO.FOLDER_RECORD.FIELDS.NAME = 'name';
    RECORD_INFO.FOLDER_RECORD.FIELDS.FILE = 'file';
    RECORD_INFO.FOLDER_RECORD.FIELDS.PARENT = 'parent';
    RECORD_INFO.FOLDER_RECORD.FIELDS.VALUE = 'DIOT txt';
    RECORD_INFO.FOLDER_RECORD.FIELDS.FILE_NAME = 'file.name';

    RECORD_INFO.DIOT_RECORD = {};
    RECORD_INFO.DIOT_RECORD.ID = 'customrecord_fb_diot';
    RECORD_INFO.DIOT_RECORD.FIELDS = {};
    RECORD_INFO.DIOT_RECORD.FIELDS.INACTIVE = 'isinactive';
    RECORD_INFO.DIOT_RECORD.FIELDS.ID = 'custrecord_fb_id_interno_diot';
    RECORD_INFO.DIOT_RECORD.FIELDS.SUBSIDIARY = 'custrecord_fb_subsidiaria_diot';
    RECORD_INFO.DIOT_RECORD.FIELDS.PERIOD = 'custrecord_fb_periodo_diot';
    RECORD_INFO.DIOT_RECORD.FIELDS.FOLDER_ID = 'custrecord_fb_id_carpeta_diot';
    RECORD_INFO.DIOT_RECORD.FIELDS.FILE = 'custrecord_fb_archivotxt_diot';
    RECORD_INFO.DIOT_RECORD.FIELDS.STATUS = 'custrecord_fb_estado_diot';
    RECORD_INFO.DIOT_RECORD.FIELDS.PERCENTAGE = 'custrecord_fb_porcentaje_diot';
    RECORD_INFO.DIOT_RECORD.FIELDS.ERROR = 'custrecord_fb_errores_diot';
    RECORD_INFO.DIOT_RECORD.FIELDS.TASK_ID = 'custrecord_fb_task_id';
    RECORD_INFO.DIOT_RECORD.FIELDS.PROGRESS = 'custrecord_fb_porcentaje_avance';

    RECORD_INFO.DESGLOSE_TAX_RECORD = {};
    RECORD_INFO.DESGLOSE_TAX_RECORD.ID = 'customrecord_efx_fe_desglose_tax';
    RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS = {};
    RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.EXENTO = 'custrecord_efx_fe_desglose_exento';
    RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IVA = 'custrecord_efx_fe_desglose_iva';
    RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.RETENCION = 'custrecord_efx_fe_desglose_ret';
    RECORD_INFO.DESGLOSE_TAX_RECORD.FIELDS.IEPS = 'custrecord_efx_fe_desglose_ieps';

    RECORD_INFO.ERRORES_DIOT = {};
    RECORD_INFO.ERRORES_DIOT.ID = 'customrecord_fb_errores_diot';
    RECORD_INFO.ERRORES_DIOT.FIELDS = {};
    RECORD_INFO.ERRORES_DIOT.FIELDS.ID = 'id';
    RECORD_INFO.ERRORES_DIOT.FIELDS.INACTIVE = 'isinactive';
    RECORD_INFO.ERRORES_DIOT.FIELDS.TIPO = 'custrecord_fb_tipo_error'
    RECORD_INFO.ERRORES_DIOT.FIELDS.DETALLE = 'custrecord_fb_detalle_error';
    RECORD_INFO.ERRORES_DIOT.FIELDS.TRANSACCION = 'custrecord_fb_diot_rel_tran';
    RECORD_INFO.ERRORES_DIOT.FIELDS.PROVEEDOR = 'custrecord_fb_diot_rel_prov';
    RECORD_INFO.ERRORES_DIOT.FIELDS.HISTORIAL_DIOT = 'custrecord_fb_hist_diot';
    RECORD_INFO.ERRORES_DIOT.FIELDS.PROPIETARIO = 'owner';
    RECORD_INFO.ERRORES_DIOT.FIELDS.FECHA_CREACION = 'created';

    const STATUS_LIST_DIOT = {};

    STATUS_LIST_DIOT.PENDING = 1;
    STATUS_LIST_DIOT.OBTAINING_DATA = 2;
    STATUS_LIST_DIOT.VALIDATING_DATA = 3;
    STATUS_LIST_DIOT.BUILDING = 4;
    STATUS_LIST_DIOT.COMPLETE = 5;
    STATUS_LIST_DIOT.ERROR = 6;

    const LISTS = {};
    LISTS.TIPO_TERCERO = {};
    LISTS.TIPO_TERCERO.ID = 'customlist_fb_diot_tipo_tercero';
    LISTS.TIPO_TERCERO.VALUES = {};
    LISTS.TIPO_TERCERO.VALUES.NACIONAL = '1';
    LISTS.TIPO_TERCERO.VALUES.EXTRANJERO = '2';
    LISTS.TIPO_TERCERO.VALUES.GLOBAL = '3';

    const SCRIPTS_INFO = {};

    SCRIPTS_INFO.MAP_REDUCE = {};
    SCRIPTS_INFO.MAP_REDUCE.SCRIPT_ID = 'customscript_fb_generate_diot_mr';
    SCRIPTS_INFO.MAP_REDUCE.DEPLOYMENT_ID = 'customdeploy_fb_diot_generate_1';
    SCRIPTS_INFO.MAP_REDUCE.PARAMETERS = {};
    SCRIPTS_INFO.MAP_REDUCE.PARAMETERS.SUBSIDIARY = 'custscript_fb_diot_subsidiary';
    SCRIPTS_INFO.MAP_REDUCE.PARAMETERS.PERIOD = 'custscript_fb_diot_periodo';
    SCRIPTS_INFO.MAP_REDUCE.PARAMETERS.RECORD_DIOT_ID = 'custscript_fb_diot_record_id';
    SCRIPTS_INFO.MAP_REDUCE.PARAMETERS.FOLDER_RAIZ = 'custscript_fb_diot_folder_raiz';
    SCRIPTS_INFO.MAP_REDUCE.PARAMETERS.NOTIFICAR = 'custscript_fb_diot_notificar_correo';

    SCRIPTS_INFO.SUITELET = {};
    SCRIPTS_INFO.SUITELET.SCRIPT_ID = 'customscript_fb_diot_view_sl';
    SCRIPTS_INFO.SUITELET.DEPLOYMENT_ID = 'customdeploy_fb_diot_view_sl';
    SCRIPTS_INFO.SUITELET.PARAMETERS = {};
    SCRIPTS_INFO.SUITELET.PARAMETERS.SUBSIDIARY = 'subsidiaria';
    SCRIPTS_INFO.SUITELET.PARAMETERS.PERIOD = 'periodo';

    SCRIPTS_INFO.CLIENT = {};
    SCRIPTS_INFO.CLIENT.FILE_NAME = 'fb_diot_cs.js';

    const RUNTIME = {};

    RUNTIME.FEATURES = {};
    RUNTIME.FEATURES.SUBSIDIARIES = 'subsidiaries';
    RUNTIME.FEATURES.SUITETAX = 'tax_overhauling';

    const COMPANY_INFORMATION = {};

    COMPANY_INFORMATION.FIELDS = {};
    COMPANY_INFORMATION.FIELDS.ID = 'companyname';

    const OPERATION_TYPE = {};

    OPERATION_TYPE.SERVICIOS = '1';
    OPERATION_TYPE.INMUEBLES = '2';
    OPERATION_TYPE.OTROS = '3';
    OPERATION_TYPE.SERVICIOS_VALOR = '03';
    OPERATION_TYPE.INMUEBLES_VALOR = '06';
    OPERATION_TYPE.OTROS_VALOR = '85';

    return {
        INTERFACE: INTERFACE,
        RECORD_INFO: RECORD_INFO,
        STATUS_LIST_DIOT: STATUS_LIST_DIOT,
        LISTS: LISTS,
        SCRIPTS_INFO: SCRIPTS_INFO,
        RUNTIME: RUNTIME,
        COMPANY_INFORMATION: COMPANY_INFORMATION,
        OPERATION_TYPE: OPERATION_TYPE
    }
});