// sap.ui.define([
//     "sap/ui/core/mvc/Controller",
//     "sap/ui/model/json/JSONModel",
//     "sap/m/MessageToast",
//     "sap/m/MessageBox",
//     "sap/ui/core/format/DateFormat",
//     "sap/ui/core/Fragment",
//     "sap/ui/model/Filter",
//     "sap/ui/model/FilterOperator",
//     "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
//     "sap/ui/table/Column",
//     "sap/m/Column",
//     "sap/m/Text",
//     "sap/m/Label",
//     "sap/ui/export/Spreadsheet",
//     "sap/ui/export/library",
//     "sap/m/ColumnListItem"
// ], function (
//     Controller,
//     JSONModel,
//     MessageToast,
//     MessageBox,
//     DateFormat,
//     Fragment,
//     Filter,
//     FilterOperator,
//     ValueHelpDialog,
//     UIColumn,
//     MColumn,
//     Text,
//     Label,
//     Spreadsheet, exportLibrary,
//     ColumnListItem
// ) {
//     "use strict";

//     return Controller.extend("zconfpack.controller.View1", {

//         onInit: function () {
//             var oLocalModel = new JSONModel({
//                 selection: {
//                     reservation: "",
//                     postingDate: new Date(),
//                     salesOrder: "",
//                     productionOrder: "",
//                     lotNumber: "",
//                     headerPlant: "",
//                     contractorName: ""
//                 },
//                 scannedBatches: []
//             });

//             this.getView().setModel(oLocalModel, "local");
//             this._oCurrentBatchRowContext = null;
//             this._oBatchValueHelpDialog = null;
//             this._oContractorValueHelpDialog = null;
//         },

//         onExportExcel: function () {
//             var oView = this.getView();
//             var oLocalModel = oView.getModel("local");
//             var aScannedBatches = oLocalModel.getProperty("/scannedBatches") || [];

//             if (!aScannedBatches.length) {
//                 MessageBox.warning("No data available to export.");
//                 return;
//             }

//             var aExportData = aScannedBatches.map(function (oItem) {
//                 return {
//                     material: oItem.material || "",
//                     reservation_item: oItem.reservation_item || "",
//                     description: oItem.description || "",
//                     requiredQty: parseFloat(String(oItem.requiredQty || 0).replace(/,/g, "")) || 0,
//                     reqUom: oItem.reqUom || "",
//                     batch: oItem.batch || "",
//                     toBatch: oItem.toBatch || "",
//                     issuedQty: parseFloat(String(oItem.issuedQty || 0).replace(/,/g, "")) || 0,
//                     uom: oItem.uom || "",
//                     issueLocation: oItem.issueLocation || "",
//                     receivingLocation: oItem.receivingLocation || "",
//                     salesOrder: (oItem.salesOrder || "").toString(),
//                     salesOrderItem: (oItem.salesOrderItem || "").toString(),
//                     productionOrder: (oItem.productionOrder || "").toString()
//                 };
//             });

//             var oSettings = {
//                 workbook: {
//                     columns: this._createColumnConfig(),
//                     context: {
//                         sheetName: "Reservation Items"
//                     }
//                 },
//                 dataSource: aExportData,
//                 fileName: "Reservation_Items.xlsx"
//             };

//             var oSpreadsheet = new Spreadsheet(oSettings);

//             oSpreadsheet.build()
//                 .then(function () {
//                     MessageToast.show("Excel export completed successfully.");
//                 })
//                 .catch(function (oError) {
//                     MessageBox.error("Error while exporting to Excel.");
//                     console.error("Excel export error:", oError);
//                 })
//                 .finally(function () {
//                     oSpreadsheet.destroy();
//                 });
//         },

//         _createColumnConfig: function () {
//             var EdmType = exportLibrary.EdmType;

//             return [
//                 { label: "Material", property: "material", type: EdmType.String },
//                 { label: "Reservation Item", property: "reservation_item", type: EdmType.String },
//                 { label: "Description", property: "description", type: EdmType.String },
//                 { label: "Required Qty", property: "requiredQty", type: EdmType.Number, scale: 3 },
//                 { label: "Req UoM", property: "reqUom", type: EdmType.String },
//                 { label: "From Batch", property: "batch", type: EdmType.String },
//                 { label: "To Batch", property: "toBatch", type: EdmType.String },
//                 { label: "Issued Qty", property: "issuedQty", type: EdmType.Number, scale: 3 },
//                 { label: "Issue UoM", property: "uom", type: EdmType.String },
//                 { label: "Issue Location", property: "issueLocation", type: EdmType.String },
//                 { label: "Receiving Location", property: "receivingLocation", type: EdmType.String },
//                 { label: "Sales Order", property: "salesOrder", type: EdmType.String },
//                 { label: "Sales Order Item", property: "salesOrderItem", type: EdmType.String },
//                 { label: "Production Order", property: "productionOrder", type: EdmType.String }
//             ];
//         },
//         onReservationChange: async function (oEvent) {
//             var sReservation = oEvent.getSource().getValue().trim();
//             var oLocalModel = this.getView().getModel("local");

//             if (!sReservation) {
//                 oLocalModel.setProperty("/selection/salesOrder", "");
//                 oLocalModel.setProperty("/selection/productionOrder", "");
//                 oLocalModel.setProperty("/selection/lotNumber", "");
//                 oLocalModel.setProperty("/selection/headerPlant", "");
//                 oLocalModel.setProperty("/selection/contractorName", "");
//                 oLocalModel.setProperty("/scannedBatches", []);
//                 return;
//             }

//             await this._fetchReservationHeader(sReservation);
//             await this._fetchReservationItems(sReservation);
//         },

//         _fetchReservationHeader: async function (sReservation) {
//             var oLocalModel = this.getView().getModel("local");
//             var sServiceUrl =
//                 "/sap/opu/odata4/sap/zsb_pack_conf/srvd_a2x/sap/zsd_pack_conf/0001/ZI_GET_RES_HDR" +
//                 "?$filter=Reservation eq '" + encodeURIComponent(sReservation) + "'";

//             try {
//                 var oResponse = await fetch(sServiceUrl, {
//                     method: "GET",
//                     headers: {
//                         "Accept": "application/json"
//                     }
//                 });

//                 if (!oResponse.ok) {
//                     throw new Error("HTTP status " + oResponse.status);
//                 }

//                 var oData = await oResponse.json();
//                 var aResults = oData.value || [];

//                 if (!aResults.length) {
//                     oLocalModel.setProperty("/selection/salesOrder", "");
//                     oLocalModel.setProperty("/selection/productionOrder", "");
//                     oLocalModel.setProperty("/selection/lotNumber", "");
//                     oLocalModel.setProperty("/selection/headerPlant", "");
//                     oLocalModel.setProperty("/selection/contractorName", "");
//                     return;
//                 }

//                 var oHeader = aResults[0];

//                 oLocalModel.setProperty("/selection/salesOrder", oHeader.sales_order || "");
//                 oLocalModel.setProperty("/selection/productionOrder", oHeader.prod_order || "");
//                 oLocalModel.setProperty("/selection/lotNumber", oHeader.YY1_LotNumber2_ORD || "");
//                 oLocalModel.setProperty("/selection/headerPlant", oHeader.plant || "");
//                 oLocalModel.setProperty("/selection/contractorName", oHeader.master_name || "");
//                 oLocalModel.refresh(true);

//             } catch (oError) {
//                 oLocalModel.setProperty("/selection/salesOrder", "");
//                 oLocalModel.setProperty("/selection/productionOrder", "");
//                 oLocalModel.setProperty("/selection/lotNumber", "");
//                 oLocalModel.setProperty("/selection/headerPlant", "");
//                 oLocalModel.setProperty("/selection/contractorName", "");
//                 console.error("Reservation header fetch error:", oError);
//                 MessageBox.error("Failed to fetch reservation header details");
//             }
//         },

//         _fetchReservationItems: async function (sReservation) {
//             var oLocalModel = this.getView().getModel("local");
//             var sServiceUrl =
//                 "/sap/opu/odata4/sap/zsb_pack_conf/srvd_a2x/sap/zsd_PACK_CONF/0001/ZI_GET_RES_ITM1" +
//                 "?$filter=Reservation eq '" + encodeURIComponent(sReservation) + "'";

//             try {
//                 var oResponse = await fetch(sServiceUrl, {
//                     method: "GET",
//                     headers: {
//                         "Accept": "application/json"
//                     }
//                 });

//                 if (!oResponse.ok) {
//                     throw new Error("HTTP status " + oResponse.status);
//                 }

//                 var oData = await oResponse.json();
//                 var aResults = oData.value || [];

//                 var aMapped = aResults.map(function (oItem, iIndex) {
//                     var fReqQty = parseFloat(oItem.ResvnItmRequiredQtyInBaseUnit) || 0;

//                     return {
//                         groupId: "GRP_" + iIndex + "_" + Date.now(),
//                         isAutoSplitRow: false,

//                         reservation_item: oItem.ReservationItem || "",
//                         material: oItem.Product || "",
//                         description: oItem.ProductDescription || "",
//                         requiredQty: fReqQty,
//                         requiredQtyTotal: fReqQty,
//                         reqUom: oItem.BaseUnit || "",

//                         batch: "",
//                         toBatch: "",
//                         issuedQty: "",
//                         maxIssuedQty: "",
//                         uom: "",
//                         plant: oItem.Plant || "",
//                         issueLocation: oItem.Issueloc || "",
//                         receivingLocation: oItem.StorageLocation || "",
//                         salesOrder: oItem.sales_order || "",
//                         salesOrderItem: oItem.so_item || "",
//                         productionOrder: oItem.prod_order || "",
//                         productType: oItem.ProductType || "",

//                         stockAvailable: true,
//                         stockMessage: ""
//                     };
//                 });

//                 var aNoStockItems = await this._checkStockAvailabilityForItems(aMapped);

//                 oLocalModel.setProperty("/scannedBatches", aMapped);
//                 oLocalModel.refresh(true);

//                 if (aMapped.length === 0) {
//                     MessageToast.show("No items found for this reservation");
//                 } else {
//                     MessageToast.show("Reservation items fetched successfully");
//                 }

//                 if (aNoStockItems.length > 0) {
//                     var sMessage = aNoStockItems.map(function (oItem) {
//                         return "Material: " + oItem.material +
//                             " | Reservation Item: " + oItem.reservation_item;
//                     }).join("\n");

//                     MessageBox.warning(
//                         "Stock not available for the following items:\n\n" +
//                         sMessage +
//                         "\n\nPlease delete these rows before submission."
//                     );
//                 }

//             } 
//             catch (oError) {
//                 oLocalModel.setProperty("/scannedBatches", []);
//                 MessageBox.error("Failed to fetch reservation items");
//                 console.error("Reservation fetch error:", oError);
//             }
//         },

//        _checkStockAvailabilityForItems: async function (aItems) {
//     var mUniqueChecks = {};
//     var aNoStockItems = [];

//     aItems.forEach(function (oItem) {
//         var sKey = [
//             oItem.material || "",
//             oItem.plant || "",
//             oItem.salesOrder || "",
//             oItem.salesOrderItem || "",
//             oItem.receivingLocation || ""
//         ].join("|");

//         if (!mUniqueChecks[sKey]) {
//             mUniqueChecks[sKey] = {
//                 key: sKey,
//                 items: [],
//                 material: oItem.material || "",
//                 plant: oItem.plant || "",
//                 salesOrder: oItem.salesOrder || "",
//                 salesOrderItem: oItem.salesOrderItem || "",
//                 receivingLocation: oItem.receivingLocation || ""
//             };
//         }

//         mUniqueChecks[sKey].items.push(oItem);
//     });

//     var aPromises = Object.keys(mUniqueChecks).map(async function (sKey) {
//         var oCheck = mUniqueChecks[sKey];
//         var aFilters = [];

//         if (oCheck.material) {
//             aFilters.push("Material eq '" + encodeURIComponent(oCheck.material) + "'");
//         }
//         if (oCheck.plant) {
//             aFilters.push("Plant eq '" + encodeURIComponent(oCheck.plant) + "'");
//         }
//         if (oCheck.salesOrder) {
//             aFilters.push("SDDocument eq '" + encodeURIComponent(oCheck.salesOrder) + "'");
//         }
//         if (oCheck.salesOrderItem) {
//             aFilters.push("SDDocumentItem eq '" + encodeURIComponent(oCheck.salesOrderItem) + "'");
//         }
//         if (oCheck.issueLocation) {
//             aFilters.push("StorageLocation eq '" + encodeURIComponent(oCheck.receivingLocation) + "'");
//         }

//         var sServiceUrl =
//             "/sap/opu/odata4/sap/zsb_pack_conf/srvd_a2x/sap/zsd_pack_conf/0001/ZI_GET_BATCHES_311E";

//         if (aFilters.length) {
//             sServiceUrl += "?$filter=" + aFilters.join(" and ");
//         }

//         try {
//             var oResponse = await fetch(sServiceUrl, {
//                 method: "GET",
//                 headers: {
//                     "Accept": "application/json"
//                 }
//             });

//             if (!oResponse.ok) {
//                 throw new Error("HTTP status " + oResponse.status);
//             }

//             var oData = await oResponse.json();
//             var aResults = oData.value || [];
//             var bStockAvailable = aResults.length > 0;

//             oCheck.items.forEach(function (oItem) {
//                 oItem.stockAvailable = bStockAvailable;
//                 oItem.stockMessage = bStockAvailable ? "" : "Stock not available";

//                 if (!bStockAvailable) {
//                     aNoStockItems.push(oItem);
//                 }
//             });
//         } catch (oError) {
//             oCheck.items.forEach(function (oItem) {
//                 oItem.stockAvailable = false;
//                 oItem.stockMessage = "Stock check failed";
//                 aNoStockItems.push(oItem);
//             });

//             console.error("Stock availability check failed for material:", oCheck.material, oError);
//         }
//     });

//     await Promise.all(aPromises);

//     return aNoStockItems;
// },

//         _setToBatchForRow: function (sPath) {
//             var oLocalModel = this.getView().getModel("local");
//             var oRowData = oLocalModel.getProperty(sPath);

//             if (!oRowData) {
//                 return;
//             }

//             var sHeaderLotNumber = oLocalModel.getProperty("/selection/lotNumber") || "";
//             var sProductType = (oRowData.productType || "").toUpperCase();
//             var sFromBatch = oRowData.batch || "";

//             if (sProductType === "ZFGP" || sProductType === "ZFGF") {
//                 oLocalModel.setProperty(sPath + "/toBatch", sHeaderLotNumber);
//             } else {
//                 oLocalModel.setProperty(sPath + "/toBatch", sFromBatch);
//             }
//         },

//         onFromBatchValueHelp: function (oEvent) {
//             this._oCurrentBatchRowContext = oEvent.getSource().getBindingContext("local");

//             if (!this._oCurrentBatchRowContext) {
//                 MessageBox.error("Unable to identify selected row.");
//                 return;
//             }

//             var oRowData = this._oCurrentBatchRowContext.getObject();

//             if (oRowData && oRowData.stockAvailable === false) {
//                 MessageBox.warning(
//                     "Stock not available for material " +
//                     (oRowData.material || "") +
//                     ". Please delete this row."
//                 );


                
//                 return;
//             }

//             this._openBatchValueHelp();
//         },

//         _openBatchValueHelp: function () {
//             var oRowData = this._oCurrentBatchRowContext.getObject();
//             var oView = this.getView();

//             if (!this._oBatchValueHelpDialog) {
//                 this._oBatchValueHelpDialog = new ValueHelpDialog({
//                     title: "Select Batch",
//                     supportMultiselect: false,
//                     supportRanges: false,
//                     key: "Batch",
//                     descriptionKey: "ProductDescription",
//                     ok: this._onBatchValueHelpOk.bind(this),
//                     cancel: this._onBatchValueHelpCancel.bind(this),
//                     afterClose: function () {
//                         if (this._sPendingNextFocusPath) {
//                             var sPath = this._sPendingNextFocusPath;
//                             this._sPendingNextFocusPath = null;

//                             jQuery.sap.delayedCall(200, this, function () {
//                                 this._focusNextFromBatchInput(sPath);
//                             });
//                         }
//                     }.bind(this)
//                 });

//                 oView.addDependent(this._oBatchValueHelpDialog);
//             }

//             var oDialog = this._oBatchValueHelpDialog;

//             oDialog.getTableAsync().then(function (oTable) {
//                 oTable.setModel(oView.getModel());

//                 if (oTable.bindRows) {
//                     oTable.destroyColumns();

//                     oTable.addColumn(new UIColumn({
//                         label: new Label({ text: "Material" }),
//                         template: new Text({ text: "{Material}" })
//                     }));
//                     oTable.addColumn(new UIColumn({
//                         label: new Label({ text: "Description" }),
//                         template: new Text({ text: "{ProductDescription}" })
//                     }));
//                     oTable.addColumn(new UIColumn({
//                         label: new Label({ text: "Quantity" }),
//                         template: new Text({ text: "{QTY}" })
//                     }));
//                     oTable.addColumn(new UIColumn({
//                         label: new Label({ text: "UoM" }),
//                         template: new Text({ text: "{MaterialBaseUnit}" })
//                     }));

//                     oTable.addColumn(new UIColumn({
//                         label: new Label({ text: "Issue Location" }),
//                         template: new Text({ text: "{StorageLocation}" })
//                     }));

//                     oTable.addColumn(new UIColumn({
//                         label: new Label({ text: "Sales Order" }),
//                         template: new Text({ text: "{SDDocument}" })
//                     }));

//                     oTable.addColumn(new UIColumn({
//                         label: new Label({ text: "Sales Order Item" }),
//                         template: new Text({ text: "{SDDocumentItem}" })
//                     }));
//                     oTable.addColumn(new UIColumn({
//                         label: new Label({ text: "Batch" }),
//                         template: new Text({ text: "{Batch}" })
//                     }));


//                     oTable.bindRows({
//                         path: "/ZI_GET_BATCHES_311E"
//                     });

//                     var aFilters = [];
//                     if (oRowData.material) {
//                         aFilters.push(new Filter("Material", FilterOperator.EQ, oRowData.material));
//                     }
//                     if (oRowData.plant) {
//                         aFilters.push(new Filter("Plant", FilterOperator.EQ, oRowData.plant));
//                     }
//                     if (oRowData.salesOrder) {
//                         aFilters.push(new Filter("SDDocument", FilterOperator.EQ, oRowData.salesOrder));
//                     }
//                     if (oRowData.salesOrderItem) {
//                         aFilters.push(new Filter("SDDocumentItem", FilterOperator.EQ, oRowData.salesOrderItem));
//                     }
//                     if (oRowData.receivingLocation) {
//                         aFilters.push(new Filter("StorageLocation", FilterOperator.EQ, oRowData.receivingLocation));
//                     }

//                     var oRowsBinding = oTable.getBinding("rows");
//                     if (oRowsBinding) {
//                         oRowsBinding.filter(aFilters);
//                     }
//                 } else if (oTable.bindItems) {
//                     oTable.destroyColumns();

//                     oTable.addColumn(new MColumn({
//                         header: new Label({ text: "Material" })
//                     }));
//                     oTable.addColumn(new MColumn({
//                         header: new Label({ text: "Description" })
//                     }));
//                     oTable.addColumn(new MColumn({
//                         header: new Label({ text: "Quantity" })
//                     }));
//                     oTable.addColumn(new MColumn({
//                         header: new Label({ text: "UoM" })
//                     }));
//                     oTable.addColumn(new MColumn({
//                         header: new Label({ text: "Batch" })
//                     }));

//                     oTable.bindItems({
//                         path: "/ZI_GET_BATCHES_311E",
//                         template: new ColumnListItem({
//                             cells: [
//                                 new Text({ text: "{Material}" }),
//                                 new Text({ text: "{ProductDescription}" }),
//                                 new Text({ text: "{QTY}" }),
//                                 new Text({ text: "{Batch}" }),
//                                 new Text({ text: "{SDocument}" }),
//                                 new Text({ text: "{SDocumentItem}" }),
//                             ]
//                         })
//                     });

//                     var aMobileFilters = [];
//                     if (oRowData.material) {
//                         aMobileFilters.push(new Filter("Material", FilterOperator.EQ, oRowData.material));
//                     }
//                     if (oRowData.plant) {
//                         aMobileFilters.push(new Filter("Plant", FilterOperator.EQ, oRowData.plant));
//                     }

//                     if (oRowData.salesOrder) {
//                         aMobileFilters.push(new Filter("SDDocument", FilterOperator.EQ, oRowData.salesOrder));
//                     }

//                     if (oRowData.salesOrderItem) {
//                         aMobileFilters.push(new Filter("SDDocumentItem", FilterOperator.EQ, oRowData.salesOrderItem));
//                     }

//                     var oItemsBinding = oTable.getBinding("items");
//                     if (oItemsBinding) {
//                         oItemsBinding.filter(aMobileFilters);
//                     }
//                 }

//                 oDialog.update();
//                 oDialog.open();
//             });
//         },



//         _onBatchValueHelpOk: function () {
//             var oDialog = this._oBatchValueHelpDialog;
//             var oTable = oDialog.getTable();
//             var oSelectedContext = null;

//             if (oTable.getSelectedIndices) {
//                 var aSelectedIndices = oTable.getSelectedIndices();
//                 if (aSelectedIndices && aSelectedIndices.length > 0) {
//                     oSelectedContext = oTable.getContextByIndex(aSelectedIndices[0]);
//                 }
//             } else if (oTable.getSelectedItem) {
//                 var oSelectedItem = oTable.getSelectedItem();
//                 if (oSelectedItem) {
//                     oSelectedContext = oSelectedItem.getBindingContext();
//                 }
//             }

//             if (!oSelectedContext || !this._oCurrentBatchRowContext) {
//                 MessageToast.show("Please select a batch");
//                 return;
//             }

//             var oSelectedData = oSelectedContext.getObject();
//             var oLocalModel = this.getView().getModel("local");
//             var sPath = this._oCurrentBatchRowContext.getPath();
//             var oCurrentRow = oLocalModel.getProperty(sPath);

//             var fRemainingBatchQty = this._getRemainingQtyForBatchSelection(oSelectedData, sPath);

//             if (fRemainingBatchQty <= 0) {
//                 if (oTable.clearSelection) {
//                     oTable.clearSelection();
//                 } else if (oTable.removeSelections) {
//                     oTable.removeSelections(true);
//                 }

//                 if (oTable.setSelectedIndex) {
//                     oTable.setSelectedIndex(-1);
//                 }

//                 MessageBox.warning("This batch is already fully used and cannot be selected again.", {
//                     onClose: function () {
//                         if (oDialog) {
//                             oDialog.close();
//                         }
//                     }
//                 });

//                 return;
//             }

//             var fRemainingBeforeAllocation = this._getRemainingQtyForGroup(oCurrentRow);
//             var fIssueQtyToSet = this._roundTo3Decimals(
//                 Math.min(fRemainingBatchQty, fRemainingBeforeAllocation)
//             );

//             oLocalModel.setProperty(sPath + "/batch", oSelectedData.Batch || "");
//             oLocalModel.setProperty(sPath + "/material", oSelectedData.Material || "");
//             oLocalModel.setProperty(sPath + "/description", oSelectedData.ProductDescription || "");
//             oLocalModel.setProperty(sPath + "/issuedQty", fIssueQtyToSet);
//             oLocalModel.setProperty(sPath + "/maxIssuedQty", fRemainingBatchQty);
//             oLocalModel.setProperty(sPath + "/uom", oSelectedData.MaterialBaseUnit || "");
//             // oLocalModel.setProperty(sPath + "/issueLocation", oSelectedData.StorageLocation || "");

//             this._setToBatchForRow(sPath);
//             this._sPendingNextFocusPath = sPath;

//             oDialog.close();

//             this._updateGroupRemainingQtyDisplay(oCurrentRow.groupId);
//             this._insertFollowupRowIfNeeded(sPath);

//             MessageToast.show("Batch / Quantity selected successfully");
//         },

//         _onBatchValueHelpCancel: function () {
//             if (this._oBatchValueHelpDialog) {
//                 this._oBatchValueHelpDialog.close();
//             }
//         },

//         onBatchChange: async function (oEvent) {
//             var oInput = oEvent.getSource();
//             var sBatch = oEvent.getParameter("value").trim();
//             var oContext = oInput.getBindingContext("local");

//             if (!oContext) {
//                 return;
//             }

//             var sPath = oContext.getPath();
//             var oLocalModel = this.getView().getModel("local");
//             var oRowData = oLocalModel.getProperty(sPath);

//             if (!sBatch) {
//                 oLocalModel.setProperty(sPath + "/issuedQty", "");
//                 oLocalModel.setProperty(sPath + "/maxIssuedQty", "");
//                 oLocalModel.setProperty(sPath + "/uom", "");
//                 // oLocalModel.setProperty(sPath + "/issueLocation", "");
//                 this._updateGroupRemainingQtyDisplay(oRowData.groupId);
//                 this._removeExtraEmptyFollowupRows(oRowData.groupId);
//                 this._insertFollowupRowIfNeeded(sPath);
//                 return;
//             }

//             await this._fetchBatchDetailsForRow(sPath, oRowData, sBatch);
//         },

//         _getUsedQtyForBatch: function (sBatch, sCurrentPath) {
//             var aRows = this.getView().getModel("local").getProperty("/scannedBatches") || [];
//             var fUsedQty = 0;

//             aRows.forEach(function (oRow, iIndex) {
//                 var sRowPath = "/scannedBatches/" + iIndex;
//                 var sRowBatch = (oRow.batch || "").trim();

//                 if (
//                     sRowPath !== sCurrentPath &&
//                     sRowBatch !== "" &&
//                     sBatch &&
//                     sRowBatch === sBatch
//                 ) {
//                     fUsedQty += parseFloat(oRow.issuedQty) || 0;
//                 }
//             });

//             return fUsedQty;
//         },

//         // get remaining quantity for a batch selection considering already used quantities in other rows
//         _getRemainingQtyForBatchSelection: function (oBatchData, sCurrentPath) {
//             var fAvailableQty = parseFloat(oBatchData.QTY) || 0;
//             var fUsedQty = this._getUsedQtyForBatch(oBatchData.Batch, sCurrentPath);
//             var fRemainingQty = fAvailableQty - fUsedQty;

//             return fRemainingQty > 0 ? fRemainingQty : 0;
//         },

//         _isBatchFullyConsumed: function (oBatchData, sCurrentPath) {
//             return this._getRemainingQtyForBatchSelection(oBatchData, sCurrentPath) <= 0;
//         },

//         _fetchBatchDetailsForRow: async function (sPath, oRowData, sBatch) {
//             var oLocalModel = this.getView().getModel("local");

//             var aFilters = [];
//             aFilters.push("Batch eq '" + encodeURIComponent(sBatch) + "'");

//             if (oRowData.material) {
//                 aFilters.push("Material eq '" + encodeURIComponent(oRowData.material) + "'");
//             }

//             if (oRowData.SalesOrder) {
//                 aFilters.push("SDDocument eq '" + encodeURIComponent(oRowData.SalesOrder) + "'");
//             }

//             if (oRowData.receivingLocation) {
//     aFilters.push("StorageLocation eq '" + encodeURIComponent(oRowData.receivingLocation) + "'");
// }

//             if (oRowData.SalesOrderItem) {
//                 aFilters.push("SDDocumentItem eq '" + encodeURIComponent(oRowData.SalesOrderItem) + "'");
//             }

//             if (oRowData.plant) {
//                 aFilters.push("Plant eq '" + encodeURIComponent(oRowData.plant) + "'");
//             }

//             var sFilter = "$filter=" + aFilters.join(" and ");

//             var sServiceUrl =
//                 "/sap/opu/odata4/sap/zsb_pack_conf/srvd_a2x/sap/zsd_pack_conf/0001/ZI_GET_BATCHES_311E?" +
//                 sFilter;

//             try {
//                 var oResponse = await fetch(sServiceUrl, {
//                     method: "GET",
//                     headers: {
//                         "Accept": "application/json"
//                     }
//                 });

//                 if (!oResponse.ok) {
//                     throw new Error("HTTP status " + oResponse.status);
//                 }

//                 var oData = await oResponse.json();
//                 var aResults = oData.value || [];

//                 if (!aResults.length) {
//                     oLocalModel.setProperty(sPath + "/issuedQty", "");
//                     oLocalModel.setProperty(sPath + "/maxIssuedQty", "");
//                     oLocalModel.setProperty(sPath + "/uom", "");
//                     // oLocalModel.setProperty(sPath + "/issueLocation", "");
//                     MessageToast.show("No details found for entered batch");
//                     return;
//                 }

//                 var oBatch = aResults[0];
//                 var fRemainingBatchQty = this._getRemainingQtyForBatchSelection(oBatch, sPath);

//                 if (fRemainingBatchQty <= 0) {
//                     oLocalModel.setProperty(sPath + "/batch", "");
//                     oLocalModel.setProperty(sPath + "/issuedQty", "");
//                     oLocalModel.setProperty(sPath + "/maxIssuedQty", "");
//                     oLocalModel.setProperty(sPath + "/uom", "");
//                     // oLocalModel.setProperty(sPath + "/issueLocation", "");
//                     MessageBox.warning("This batch is already fully used and cannot be selected again.");
//                     return;
//                 }

//                 var fRemainingBeforeAllocation = this._getRemainingQtyForGroup(oRowData);
//                 var fIssueQtyToSet = this._roundTo3Decimals(
//                     Math.min(fRemainingBatchQty, fRemainingBeforeAllocation)
//                 );

//                 oLocalModel.setProperty(sPath + "/issuedQty", fIssueQtyToSet);
//                 oLocalModel.setProperty(sPath + "/maxIssuedQty", fRemainingBatchQty);
//                 oLocalModel.setProperty(sPath + "/uom", oBatch.MaterialBaseUnit || "");
//                 // oLocalModel.setProperty(sPath + "/issueLocation", oBatch.StorageLocation || "");
//                 oLocalModel.setProperty(sPath + "/description", oBatch.ProductDescription || oRowData.description || "");
//                 this._setToBatchForRow(sPath);
//                 this._updateGroupRemainingQtyDisplay(oRowData.groupId);
//                 this._insertFollowupRowIfNeeded(sPath);

//                 MessageToast.show("Batch details fetched successfully");

//             } catch (oError) {
//                 oLocalModel.setProperty(sPath + "/issuedQty", "");
//                 oLocalModel.setProperty(sPath + "/maxIssuedQty", "");
//                 oLocalModel.setProperty(sPath + "/uom", "");
//                 // oLocalModel.setProperty(sPath + "/issueLocation", "");
//                 MessageBox.error("Failed to fetch batch details");
//                 console.error("Batch fetch error:", oError);
//             }
//         },

//         onIssuedQtyChange: function (oEvent) {
//             var oInput = oEvent.getSource();
//             var sValue = oInput.getValue().trim();
//             var oContext = oInput.getBindingContext("local");

//             if (!oContext) {
//                 return;
//             }

//             var sPath = oContext.getPath();
//             var oLocalModel = this.getView().getModel("local");
//             var oCurrentRow = oLocalModel.getProperty(sPath);
//             var fEnteredQty = parseFloat(sValue);
//             var fMaxQty = parseFloat(oLocalModel.getProperty(sPath + "/maxIssuedQty"));

//             if (sValue === "") {
//                 oInput.setValueState("None");
//                 oInput.setValueStateText("");
//                 oLocalModel.setProperty(sPath + "/issuedQty", "");
//                 this._updateGroupRemainingQtyDisplay(oCurrentRow.groupId);
//                 this._removeExtraEmptyFollowupRows(oCurrentRow.groupId);
//                 this._insertFollowupRowIfNeeded(sPath);
//                 return;
//             }

//             if (isNaN(fEnteredQty)) {
//                 oInput.setValueState("Error");
//                 oInput.setValueStateText("Enter a valid numeric quantity");
//                 return;
//             }

//             if (!isNaN(fMaxQty) && fEnteredQty > fMaxQty) {
//                 oInput.setValueState("Error");
//                 oInput.setValueStateText("Issued quantity cannot be greater than " + fMaxQty);
//                 MessageToast.show("Issued quantity cannot be greater than available quantity");
//                 return;
//             }

//             oInput.setValueState("None");
//             oInput.setValueStateText("");

//             oLocalModel.setProperty(sPath + "/issuedQty", this._roundTo3Decimals(fEnteredQty));
//             this._updateGroupRemainingQtyDisplay(oCurrentRow.groupId);

//             var fRemaining = this._getRemainingQtyForGroup(oCurrentRow);

//             if (fRemaining > 0) {
//                 this._insertFollowupRowIfNeeded(sPath);
//             } else {
//                 this._removeExtraEmptyFollowupRows(oCurrentRow.groupId);
//             }

//             oLocalModel.refresh(true);
//         },

//         _getRowIndexFromPath: function (sPath) {
//             return parseInt(sPath.split("/").pop(), 10);
//         },

//         _getAllocatedQtyForGroup: function (sGroupId) {
//             var aRows = this.getView().getModel("local").getProperty("/scannedBatches") || [];

//             return aRows
//                 .filter(function (oRow) {
//                     return oRow.groupId === sGroupId;
//                 })
//                 .reduce(function (sum, oRow) {
//                     return sum + (parseFloat(oRow.issuedQty) || 0);
//                 }, 0);
//         },
//         _roundTo3Decimals: function (vValue) {
//             var fValue = parseFloat(vValue) || 0;
//             return parseFloat(fValue.toFixed(3));
//         },

//         _getRemainingQtyForGroup: function (oRow) {
//             var fTotalRequired = parseFloat(oRow.requiredQtyTotal || oRow.requiredQty || 0);
//             var fAllocated = this._getAllocatedQtyForGroup(oRow.groupId);
//             var fRemaining = fTotalRequired - fAllocated;
//             fRemaining = this._roundTo3Decimals(fRemaining);
//             return fRemaining > 0 ? fRemaining : 0;
//         },

//         _createFollowupRow: function (oSourceRow) {
//             var fRemaining = this._getRemainingQtyForGroup(oSourceRow);

//             return {
//                 groupId: oSourceRow.groupId,
//                 isAutoSplitRow: true,

//                 reservation_item: oSourceRow.reservation_item || "",
//                 material: oSourceRow.material || "",
//                 description: oSourceRow.description || "",
//                 requiredQty: fRemaining,
//                 requiredQtyTotal: oSourceRow.requiredQtyTotal || oSourceRow.requiredQty || 0,
//                 reqUom: oSourceRow.reqUom || "",

//                 batch: "",
//                 toBatch: "",
//                 issuedQty: "",
//                 maxIssuedQty: "",
//                 uom: "",
//                 plant: oSourceRow.plant || "",
//                 issueLocation: oSourceRow.issueLocation || "",
//                 receivingLocation: oSourceRow.receivingLocation || "",
//                 salesOrder: oSourceRow.salesOrder || "",
//                 salesOrderItem: oSourceRow.salesOrderItem || "",
//                 productionOrder: oSourceRow.productionOrder || "",
//                 productType: oSourceRow.productType || "",
//                 stockAvailable: oSourceRow.stockAvailable,
//                 stockMessage: oSourceRow.stockMessage
//             };
//         },

//         _insertFollowupRowIfNeeded: function (sCurrentPath) {
//             var oLocalModel = this.getView().getModel("local");
//             var aRows = oLocalModel.getProperty("/scannedBatches") || [];
//             var iCurrentIndex = this._getRowIndexFromPath(sCurrentPath);
//             var oCurrentRow = aRows[iCurrentIndex];

//             if (!oCurrentRow) {
//                 return;
//             }

//             var fRemaining = this._getRemainingQtyForGroup(oCurrentRow);

//             if (fRemaining <= 0) {
//                 return;
//             }

//             var oNextRow = aRows[iCurrentIndex + 1];

//             if (
//                 oNextRow &&
//                 oNextRow.groupId === oCurrentRow.groupId &&
//                 !oNextRow.batch &&
//                 (parseFloat(oNextRow.issuedQty) || 0) === 0
//             ) {
//                 oLocalModel.setProperty("/scannedBatches/" + (iCurrentIndex + 1) + "/requiredQty", fRemaining);
//                 oLocalModel.refresh(true);
//                 return;
//             }

//             var oNewRow = this._createFollowupRow(oCurrentRow);
//             aRows.splice(iCurrentIndex + 1, 0, oNewRow);
//             oLocalModel.setProperty("/scannedBatches", aRows);
//             oLocalModel.refresh(true);
//         },

//         _removeExtraEmptyFollowupRows: function (sGroupId) {
//             var oLocalModel = this.getView().getModel("local");
//             var aRows = oLocalModel.getProperty("/scannedBatches") || [];
//             var fRemaining = 0;

//             var aGroupRows = aRows.filter(function (oRow) {
//                 return oRow.groupId === sGroupId;
//             });

//             if (aGroupRows.length > 0) {
//                 var oAnyRow = aGroupRows[0];
//                 fRemaining = this._getRemainingQtyForGroup(oAnyRow);
//             }

//             if (fRemaining > 0) {
//                 return;
//             }

//             for (var i = aRows.length - 1; i >= 0; i--) {
//                 if (
//                     aRows[i].groupId === sGroupId &&
//                     aRows[i].isAutoSplitRow === true &&
//                     !aRows[i].batch &&
//                     (
//                         aRows[i].issuedQty === "" ||
//                         aRows[i].issuedQty === null ||
//                         aRows[i].issuedQty === undefined ||
//                         parseFloat(aRows[i].issuedQty) === 0
//                     )
//                 ) {
//                     aRows.splice(i, 1);
//                 }
//             }

//             oLocalModel.setProperty("/scannedBatches", aRows);
//             oLocalModel.refresh(true);
//         },

//         _updateGroupRemainingQtyDisplay: function (sGroupId) {
//             var oLocalModel = this.getView().getModel("local");
//             var aRows = oLocalModel.getProperty("/scannedBatches") || [];

//             var aGroupRows = aRows.filter(function (oRow) {
//                 return oRow.groupId === sGroupId;
//             });

//             if (!aGroupRows.length) {
//                 return;
//             }

//             var fTotalRequired = parseFloat(aGroupRows[0].requiredQtyTotal || 0);
//             var fAllocated = this._getAllocatedQtyForGroup(sGroupId);
//             var fRemaining = this._roundTo3Decimals(fTotalRequired - fAllocated);

//             if (fRemaining < 0) {
//                 fRemaining = 0;
//             }

//             var bFirstFound = false;

//             aRows.forEach(function (oRow) {
//                 if (oRow.groupId === sGroupId) {
//                     if (!bFirstFound) {
//                         oRow.requiredQty = fTotalRequired;
//                         bFirstFound = true;
//                     } else if (!oRow.batch && (!oRow.issuedQty || parseFloat(oRow.issuedQty) === 0)) {
//                         oRow.requiredQty = fRemaining;
//                     }
//                 }
//             });

//             oLocalModel.setProperty("/scannedBatches", aRows);
//             oLocalModel.refresh(true);
//         },
//         _focusNextFromBatchInput: function (sCurrentPath) {
//             var oTable = this.byId("batchesTable");
//             var aItems = oTable.getItems();

//             if (!aItems || !aItems.length) {
//                 return;
//             }

//             var iCurrentIndex = -1;

//             aItems.some(function (oItem, iIndex) {
//                 var oCtx = oItem.getBindingContext("local");
//                 if (oCtx && oCtx.getPath() === sCurrentPath) {
//                     iCurrentIndex = iIndex;
//                     return true;
//                 }
//                 return false;
//             });

//             if (iCurrentIndex === -1) {
//                 return;
//             }

//             var iNextIndex = iCurrentIndex + 1;
//             if (iNextIndex >= aItems.length) {
//                 return;
//             }

//             var oNextItem = aItems[iNextIndex];
//             var aCells = oNextItem.getCells();

//             if (!aCells || aCells.length < 5) {
//                 return;
//             }

//             var oNextFromBatchInput = aCells[4];

//             if (oNextFromBatchInput && oNextFromBatchInput.focus) {
//                 sap.ui.getCore().applyChanges();
//                 jQuery.sap.delayedCall(100, this, function () {
//                     oNextFromBatchInput.focus();
//                 });
//             }
//         },

        

//         onNew: function () {
//             var oView = this.getView();
//             var oLocalModel = oView.getModel("local");
//             var oTable = this.byId("batchesTable");

//             oLocalModel.setData({
//                 selection: {
//                     reservation: "",
//                     postingDate: new Date(),
//                     salesOrder: "",
//                     productionOrder: "",
//                     lotNumber: "",
//                     headerPlant: ""
//                 },
//                 scannedBatches: []
//             });

//             oLocalModel.refresh(true);

//             if (oTable) {
//                 oTable.removeSelections(true);
//             }

//             var oReservationInput = this.byId("inputReservation");
//             if (oReservationInput) {
//                 oReservationInput.focus();
//             }
//         },

//         onDeleteSelected: function () {
//             var oTable = this.byId("batchesTable");
//             var oLocalModel = this.getView().getModel("local");
//             var aData = oLocalModel.getProperty("/scannedBatches") || [];
//             var aSelectedItems = oTable.getSelectedItems();

//             if (!aSelectedItems.length) {
//                 MessageBox.warning("Please select at least one line item to delete.");
//                 return;
//             }

//             MessageBox.confirm("Are you sure you want to delete the selected line item(s)?", {
//                 title: "Confirm Deletion",
//                 actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
//                 emphasizedAction: MessageBox.Action.OK,
//                 initialFocus: MessageBox.Action.CANCEL,
//                 onClose: function (sAction) {
//                     if (sAction === MessageBox.Action.OK) {
//                         var aIndexesToDelete = aSelectedItems.map(function (oItem) {
//                             var sPath = oItem.getBindingContext("local").getPath();
//                             return parseInt(sPath.split("/").pop(), 10);
//                         });

//                         var aNewData = aData.filter(function (oItem, iIndex) {
//                             return aIndexesToDelete.indexOf(iIndex) === -1;
//                         });

//                         oLocalModel.setProperty("/scannedBatches", aNewData);
//                         oLocalModel.refresh(true);

//                         if (oTable.getBinding("items")) {
//                             oTable.getBinding("items").refresh();
//                         }

//                         oTable.removeSelections(true);

//                         MessageToast.show("Selected line item(s) deleted successfully.");
//                     }
//                 }
//             });
//         },

//         onContractorValueHelp: function () {
//     var oView = this.getView();
//     var oLocalModel = oView.getModel("local");
//     var sHeaderPlant = oLocalModel.getProperty("/selection/headerPlant") || "";

//     if (!sHeaderPlant) {
//         MessageBox.warning("Please select a valid reservation to populate the Header Plant first.");
//         return;
//     }

//     if (!this._oContractorValueHelpDialog) {
//         this._oContractorValueHelpDialog = new ValueHelpDialog({
//             title: "Select Contractor Name",
//             supportMultiselect: false,
//             supportRanges: false,
//             key: "MasterName",
//             descriptionKey: "MasterName",
//             ok: this._onContractorValueHelpOk.bind(this),
//             cancel: function () {
//                 this._oContractorValueHelpDialog.close();
//             }.bind(this)
//         });

//         oView.addDependent(this._oContractorValueHelpDialog);
//     }

//     var oDialog = this._oContractorValueHelpDialog;

//     oDialog.getTableAsync().then(function (oTable) {
//         oTable.setModel(oView.getModel()); // Assumes default OData model

//         if (oTable.bindRows) {
//             oTable.destroyColumns();

//             oTable.addColumn(new UIColumn({
//                 label: new Label({ text: "Master Name" }),
//                 template: new Text({ text: "{MasterName}" })
//             }));
//             oTable.addColumn(new UIColumn({
//                 label: new Label({ text: "Operation" }),
//                 template: new Text({ text: "{Operation}" })
//             }));
//             oTable.addColumn(new UIColumn({
//                 label: new Label({ text: "Plant" }),
//                 template: new Text({ text: "{Plant}" })
//             }));
//             // oTable.addColumn(new UIColumn({
//             //     label: new Label({ text: "Work Center" }),
//             //     template: new Text({ text: "{WorkCenter}" })
//             // }));

//             // Build dynamic filters based on requirements
//             var aFilters = [
//                 new Filter("Plant", FilterOperator.EQ, sHeaderPlant),
//                 new Filter({
//                     filters: [
//                         new Filter("Operation", FilterOperator.EQ, "SET PACKIN"),
//                         new Filter("Operation", FilterOperator.EQ, "BOX PACKIN"),
//                         new Filter("Operation", FilterOperator.EQ, "CUT TO PAC")
//                     ],
//                     and: false // Logical OR between operations
//                 })
//             ];

//             oTable.bindRows({
//                 path: "/ZR_WORK_MASTER_MAP",
//                 filters: aFilters
//             });
//         }

//         oDialog.update();
//         oDialog.open();
//     }.bind(this));
// },

// _onContractorValueHelpOk: function () {
//     var oDialog = this._oContractorValueHelpDialog;
//     var oTable = oDialog.getTable();
//     var oSelectedContext = null;

//     if (oTable.getSelectedIndices) {
//         var aSelectedIndices = oTable.getSelectedIndices();
//         if (aSelectedIndices && aSelectedIndices.length > 0) {
//             oSelectedContext = oTable.getContextByIndex(aSelectedIndices[0]);
//         }
//     } else if (oTable.getSelectedItem) {
//         var oSelectedItem = oTable.getSelectedItem();
//         if (oSelectedItem) {
//             oSelectedContext = oSelectedItem.getBindingContext();
//         }
//     }

//     if (!oSelectedContext) {
//         MessageToast.show("Please select a contractor");
//         return;
//     }

//     var oSelectedData = oSelectedContext.getObject();
//     var oLocalModel = this.getView().getModel("local");

//     // Set selected Master Name into local model
//     oLocalModel.setProperty("/selection/contractorName", oSelectedData.MasterName || "");

//     oDialog.close();
//     MessageToast.show("Contractor selected successfully");
// },

    
//         onSubmit: function () {
//             var oView = this.getView();
//             var oLocalModel = oView.getModel("local");
//             var oODataModel = oView.getModel();

//             var oSelection = oLocalModel.getProperty("/selection");
//             var aScannedBatches = oLocalModel.getProperty("/scannedBatches") || [];

//             if (!oSelection.reservation || !oSelection.postingDate) {
//                 MessageBox.error("Please fill Reservation Number and Posting Date before submitting.");
//                 return;
//             }

//             if (aScannedBatches.length === 0) {
//                 MessageBox.error("No reservation items available to submit.");
//                 return;
//             }

//             var aItemsToSubmit = aScannedBatches.filter(function (oItem) {
//                 var fIssuedQty = parseFloat(String(oItem.issuedQty || "").trim());
//                 return !isNaN(fIssuedQty) && fIssuedQty > 0;
//             });

//             if (aItemsToSubmit.length === 0) {
//                 MessageBox.error("Please enter issued quantity for at least one item before submitting.");
//                 return;
//             }

//             var aInvalidItems = aItemsToSubmit.filter(function (oItem) {
//                 return !oItem.material ||

//                     !oItem.plant ||
//                     !oItem.receivingLocation;
//             });

//             if (aInvalidItems.length > 0) {
//                 MessageBox.error("Please fill Material, Unit, Plant, and Receiving Location for all items.");
//                 return;
//             }

//             var aInvalidQty = aItemsToSubmit.filter(function (oItem) {
//                 var fIssued = parseFloat(oItem.issuedQty);
//                 var fMax = parseFloat(oItem.maxIssuedQty);
//                 return !isNaN(fIssued) && !isNaN(fMax) && fIssued > fMax;
//             });

//             if (aInvalidQty.length > 0) {
//                 MessageBox.error("Issued quantity cannot be greater than fetched quantity.");
//                 return;
//             }

//             var oDateFormat = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
//             var sFormattedDate = oDateFormat.format(oSelection.postingDate);
//             var sReservation = String(oSelection.reservation).padStart(10, "0");
//             var sProdOrder = String(oSelection.productionOrder).padStart(12, "0")

//             var aItemsPayload = aItemsToSubmit.map(function (oItem) {
//                 return {
//                     "ReservationItem": (oItem.reservation_item || "").padStart(4, "0"),
//                     "Material": oItem.material || "",
//                     "Batch": oItem.batch || "",
//                     "MatDescription": oItem.description || "",
//                     "ReqQty": String(oItem.requiredQty || ""),
//                     "Unit": oItem.reqUom || "",
//                     "IssuedQty": String(oItem.issuedQty || ""),
//                     "IssuedUnit": oItem.uom || "",
//                     // "IssueLoc": oItem.issueLocation || "",
//                     "Plant": oItem.plant || "",
//                     "ToBatch": oItem.toBatch || "",
//                     "ProdOrd": oItem.productionOrder.padStart(12, "0") || "",
//                     "ReceiveLoc": oItem.receivingLocation || "",
//                     "SalesOrder": (oItem.salesOrder || "").padStart(10, "0"),
//                     "SalesOrderItem": (oItem.salesOrderItem || "").padStart(6, "0")
//                 };
//             });

//             var oPayload = {
//                 "Reservation": sReservation,
//                 "PostingDate": sFormattedDate,
//               "ContractorName": oSelection.contractorName,
//               "ProdOrd": oSelection.productionOrder,
//               "LotNum":oSelection.lotNumber,
//                 "_Item": aItemsPayload
//             };

//             console.log("Submit payload:", JSON.stringify(oPayload, null, 2));

//             oView.setBusy(true);

//             var oListBinding = oODataModel.bindList("/ZC_PACK_CONF_HD");
//             var oContext = oListBinding.create(oPayload);

//             oContext.created().then(function () {
//                 oView.setBusy(false);

//                 var sMatDoc = (oContext.getProperty("Materialdocument") || "").trim();
//                 var sMessage = (oContext.getProperty("Mess") || "").trim();

//               if (sMatDoc) {
//     MessageBox.success(
//         "Material Document " + sMatDoc + " created successfully.",
//         {
//             onClose: function () {
//                 oLocalModel.setData({
//                     selection: {
//                         reservation: "",
//                         postingDate: new Date(),
//                         salesOrder: "",
//                         productionOrder: "",
//                         lotNumber: "",
//                         headerPlant: ""
//                     },
//                     scannedBatches: []
//                 });

//                 var oReservationInput = oView.byId("inputReservation");
//                 if (oReservationInput) {
//                     oReservationInput.focus();
//                 }
//             }
//         }
//     );
// } else {
//     MessageBox.error(sMessage || "Material document was not created.");
// }

//             }).catch(function (oError) {
//                 oView.setBusy(false);

//                 var sErrorMsg = "Failed to submit transfer posting.";
//                 if (oError && oError.message) {
//                     sErrorMsg = oError.message;
//                 }

//                 MessageBox.error(sErrorMsg);
//                 console.error("Submit error:", oError);
//             });
//         }

//     });
// });

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
    "sap/ui/table/Column",
    "sap/m/Column",
    "sap/m/Text",
    "sap/m/Label",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "sap/m/ColumnListItem"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    DateFormat,
    Fragment,
    Filter,
    FilterOperator,
    ValueHelpDialog,
    UIColumn,
    MColumn,
    Text,
    Label,
    Spreadsheet, exportLibrary,
    ColumnListItem
) {
    "use strict";

    return Controller.extend("zconfpack.controller.View1", {

        onInit: function () {
            var oLocalModel = new JSONModel(this._getInitialData());

            this.getView().setModel(oLocalModel, "local");
            this._oCurrentBatchRowContext = null;
            this._oBatchValueHelpDialog = null;
            this._oContractorValueHelpDialog = null;
        },

        // Single place for the empty screen state (used by onInit, onNew and after a successful post)
        _getInitialData: function () {
            return {
                selection: {
                    reservation: "",
                    postingDate: new Date(),
                    salesOrder: "",
                    productionOrder: "",
                    lotNumber: "",
                    headerPlant: "",
                    contractorName: ""
                },
                scannedBatches: []
            };
        },

        _clearHeaderFields: function () {
            var oLocalModel = this.getView().getModel("local");
            oLocalModel.setProperty("/selection/salesOrder", "");
            oLocalModel.setProperty("/selection/productionOrder", "");
            oLocalModel.setProperty("/selection/lotNumber", "");
            oLocalModel.setProperty("/selection/headerPlant", "");
            oLocalModel.setProperty("/selection/contractorName", "");
        },

        _roundTo3Decimals: function (vValue) {
            var fValue = parseFloat(vValue) || 0;
            return parseFloat(fValue.toFixed(3));
        },

        // ==========================================
        // EXCEL EXPORT
        // ==========================================

        onExportExcel: function () {
            var oView = this.getView();
            var oLocalModel = oView.getModel("local");
            var aScannedBatches = oLocalModel.getProperty("/scannedBatches") || [];

            if (!aScannedBatches.length) {
                MessageBox.warning("No data available to export.");
                return;
            }

            var aExportData = aScannedBatches.map(function (oItem) {
                return {
                    material: oItem.material || "",
                    reservation_item: oItem.reservation_item || "",
                    description: oItem.description || "",
                    requiredQty: parseFloat(String(oItem.requiredQty || 0).replace(/,/g, "")) || 0,
                    reqUom: oItem.reqUom || "",
                    totalIssuedQty: parseFloat(String(oItem.totalIssuedQty || 0).replace(/,/g, "")) || 0,
                    pendingQty: parseFloat(String(oItem.pendingQty || 0).replace(/,/g, "")) || 0,
                    batch: oItem.batch || "",
                    toBatch: oItem.toBatch || "",
                    issuedQty: parseFloat(String(oItem.issuedQty || 0).replace(/,/g, "")) || 0,
                    uom: oItem.uom || "",
                    issueLocation: oItem.issueLocation || "",
                    receivingLocation: oItem.receivingLocation || "",
                    salesOrder: (oItem.salesOrder || "").toString(),
                    salesOrderItem: (oItem.salesOrderItem || "").toString(),
                    productionOrder: (oItem.productionOrder || "").toString()
                };
            });

            var oSettings = {
                workbook: {
                    columns: this._createColumnConfig(),
                    context: {
                        sheetName: "Reservation Items"
                    }
                },
                dataSource: aExportData,
                fileName: "Reservation_Items.xlsx"
            };

            var oSpreadsheet = new Spreadsheet(oSettings);

            oSpreadsheet.build()
                .then(function () {
                    MessageToast.show("Excel export completed successfully.");
                })
                .catch(function (oError) {
                    MessageBox.error("Error while exporting to Excel.");
                    console.error("Excel export error:", oError);
                })
                .finally(function () {
                    oSpreadsheet.destroy();
                });
        },

        _createColumnConfig: function () {
            var EdmType = exportLibrary.EdmType;

            return [
                { label: "Material", property: "material", type: EdmType.String },
                { label: "Reservation Item", property: "reservation_item", type: EdmType.String },
                { label: "Description", property: "description", type: EdmType.String },
                { label: "Required Qty", property: "requiredQty", type: EdmType.Number, scale: 3 },
                { label: "Req UoM", property: "reqUom", type: EdmType.String },
                { label: "Total Issued Qty", property: "totalIssuedQty", type: EdmType.Number, scale: 3 },
                { label: "Pending Qty", property: "pendingQty", type: EdmType.Number, scale: 3 },
                { label: "From Batch", property: "batch", type: EdmType.String },
                { label: "To Batch", property: "toBatch", type: EdmType.String },
                { label: "Qty To Issue", property: "issuedQty", type: EdmType.Number, scale: 3 },
                // { label: "Issue UoM", property: "uom", type: EdmType.String },
                { label: "Issue Location", property: "issueLocation", type: EdmType.String },
                { label: "Receiving Location", property: "receivingLocation", type: EdmType.String },
                { label: "Sales Order", property: "salesOrder", type: EdmType.String },
                { label: "Sales Order Item", property: "salesOrderItem", type: EdmType.String },
                { label: "Production Order", property: "productionOrder", type: EdmType.String }
            ];
        },

        // ==========================================
        // RESERVATION HEADER / ITEMS
        // ==========================================

        onReservationChange: async function (oEvent) {
            var sReservation = oEvent.getSource().getValue().trim();
            var oLocalModel = this.getView().getModel("local");

            if (!sReservation) {
                this._clearHeaderFields();
                oLocalModel.setProperty("/scannedBatches", []);
                return;
            }

            await this._fetchReservationHeader(sReservation);
            await this._fetchReservationItems(sReservation);
        },

        _fetchReservationHeader: async function (sReservation) {
            var oLocalModel = this.getView().getModel("local");
            var sServiceUrl =
                "/sap/opu/odata4/sap/zsb_pack_conf/srvd_a2x/sap/zsd_pack_conf/0001/ZI_GET_RES_HDR" +
                "?$filter=Reservation eq '" + encodeURIComponent(sReservation) + "'";

            try {
                var oResponse = await fetch(sServiceUrl, {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    }
                });

                if (!oResponse.ok) {
                    throw new Error("HTTP status " + oResponse.status);
                }

                var oData = await oResponse.json();
                var aResults = oData.value || [];

                if (!aResults.length) {
                    this._clearHeaderFields();
                    return;
                }

                var oHeader = aResults[0];

                oLocalModel.setProperty("/selection/salesOrder", oHeader.sales_order || "");
                oLocalModel.setProperty("/selection/productionOrder", oHeader.prod_order || "");
                oLocalModel.setProperty("/selection/lotNumber", oHeader.YY1_LotNumber2_ORD || "");
                oLocalModel.setProperty("/selection/headerPlant", oHeader.plant || "");
                oLocalModel.setProperty("/selection/contractorName", oHeader.master_name || "");
                oLocalModel.refresh(true);

            } catch (oError) {
                this._clearHeaderFields();
                console.error("Reservation header fetch error:", oError);
                MessageBox.error("Failed to fetch reservation header details");
            }
        },

        _fetchReservationItems: async function (sReservation) {
            var oLocalModel = this.getView().getModel("local");
            var sServiceUrl =
                "/sap/opu/odata4/sap/zsb_pack_conf/srvd_a2x/sap/zsd_pack_conf/0001/ZI_GET_RES_ITM1" +
                "?$filter=Reservation eq '" + encodeURIComponent(sReservation) + "'";

            try {
                var oResponse = await fetch(sServiceUrl, {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    }
                });

                if (!oResponse.ok) {
                    throw new Error("HTTP status " + oResponse.status);
                }

                var oData = await oResponse.json();
                var aResults = oData.value || [];

                var aMapped = aResults.map(function (oItem) {
                    return {
                        reservation_item: oItem.ReservationItem || "",
                        material: oItem.Product || "",
                        description: oItem.ProductDescription || "",
                        requiredQty: parseFloat(oItem.ResvnItmRequiredQtyInBaseUnit) || 0,
                        reqUom: oItem.BaseUnit || "",

                        // From ZI_GET_RES_ITM1 / ZI_RESERVATION_QUANTITY_SUM
                        totalIssuedQty: parseFloat(oItem.TotalissuedQty) || 0,
                        pendingQty: parseFloat(oItem.pendingQty) || 0,

                        batch: "",
                        toBatch: "",
                        issuedQty: "",
                        maxIssuedQty: "",
                        uom: "",
                        plant: oItem.Plant || "",
                        issueLocation: oItem.Issueloc || "",
                        receivingLocation: oItem.StorageLocation || "",
                        salesOrder: oItem.sales_order || "",
                        salesOrderItem: oItem.so_item || "",
                        productionOrder: oItem.prod_order || "",
                        productType: oItem.ProductType || "",

                        stockAvailable: true,
                        stockMessage: ""
                    };
                });

                var aNoStockItems = await this._checkStockAvailabilityForItems(aMapped);

                oLocalModel.setProperty("/scannedBatches", aMapped);
                oLocalModel.refresh(true);

                if (aMapped.length === 0) {
                    MessageToast.show("No items found for this reservation");
                } else {
                    MessageToast.show("Reservation items fetched successfully");
                }

                if (aNoStockItems.length > 0) {
                    var sMessage = aNoStockItems.map(function (oItem) {
                        return "Material: " + oItem.material +
                            " | Reservation Item: " + oItem.reservation_item;
                    }).join("\n");

                    MessageBox.warning(
                        "Stock not available for the following items:\n\n" +
                        sMessage +
                        "\n\nPlease delete these rows before submission."
                    );
                }

            } catch (oError) {
                oLocalModel.setProperty("/scannedBatches", []);
                MessageBox.error("Failed to fetch reservation items");
                console.error("Reservation fetch error:", oError);
            }
        },

        _checkStockAvailabilityForItems: async function (aItems) {
            var mUniqueChecks = {};
            var aNoStockItems = [];

            aItems.forEach(function (oItem) {
                var sKey = [
                    oItem.material || "",
                    oItem.plant || "",
                    oItem.salesOrder || "",
                    oItem.salesOrderItem || "",
                    oItem.receivingLocation || ""
                ].join("|");

                if (!mUniqueChecks[sKey]) {
                    mUniqueChecks[sKey] = {
                        key: sKey,
                        items: [],
                        material: oItem.material || "",
                        plant: oItem.plant || "",
                        salesOrder: oItem.salesOrder || "",
                        salesOrderItem: oItem.salesOrderItem || "",
                        receivingLocation: oItem.receivingLocation || ""
                    };
                }

                mUniqueChecks[sKey].items.push(oItem);
            });

            var aPromises = Object.keys(mUniqueChecks).map(async function (sKey) {
                var oCheck = mUniqueChecks[sKey];
                var aFilters = [];

                if (oCheck.material) {
                    aFilters.push("Material eq '" + encodeURIComponent(oCheck.material) + "'");
                }
                if (oCheck.plant) {
                    aFilters.push("Plant eq '" + encodeURIComponent(oCheck.plant) + "'");
                }
                if (oCheck.salesOrder) {
                    aFilters.push("SDDocument eq '" + encodeURIComponent(oCheck.salesOrder) + "'");
                }
                if (oCheck.salesOrderItem) {
                    aFilters.push("SDDocumentItem eq '" + encodeURIComponent(oCheck.salesOrderItem) + "'");
                }
                if (oCheck.receivingLocation) {
                    aFilters.push("StorageLocation eq '" + encodeURIComponent(oCheck.receivingLocation) + "'");
                }

                var sServiceUrl =
                    "/sap/opu/odata4/sap/zsb_pack_conf/srvd_a2x/sap/zsd_pack_conf/0001/ZI_GET_BATCHES_311E";

                if (aFilters.length) {
                    sServiceUrl += "?$filter=" + aFilters.join(" and ");
                }

                try {
                    var oResponse = await fetch(sServiceUrl, {
                        method: "GET",
                        headers: {
                            "Accept": "application/json"
                        }
                    });

                    if (!oResponse.ok) {
                        throw new Error("HTTP status " + oResponse.status);
                    }

                    var oData = await oResponse.json();
                    var aResults = oData.value || [];
                    var bStockAvailable = aResults.length > 0;

                    oCheck.items.forEach(function (oItem) {
                        oItem.stockAvailable = bStockAvailable;
                        oItem.stockMessage = bStockAvailable ? "" : "Stock not available";

                        if (!bStockAvailable) {
                            aNoStockItems.push(oItem);
                        }
                    });
                } catch (oError) {
                    oCheck.items.forEach(function (oItem) {
                        oItem.stockAvailable = false;
                        oItem.stockMessage = "Stock check failed";
                        aNoStockItems.push(oItem);
                    });

                    console.error("Stock availability check failed for material:", oCheck.material, oError);
                }
            });

            await Promise.all(aPromises);

            return aNoStockItems;
        },

        _setToBatchForRow: function (sPath) {
            var oLocalModel = this.getView().getModel("local");
            var oRowData = oLocalModel.getProperty(sPath);

            if (!oRowData) {
                return;
            }

            var sHeaderLotNumber = oLocalModel.getProperty("/selection/lotNumber") || "";
            var sProductType = (oRowData.productType || "").toUpperCase();
            var sFromBatch = oRowData.batch || "";

            if (sProductType === "ZFGP" || sProductType === "ZFGF") {
                oLocalModel.setProperty(sPath + "/toBatch", sHeaderLotNumber);
            } else {
                oLocalModel.setProperty(sPath + "/toBatch", sFromBatch);
            }
        },

        // Default quantity proposed after a batch is picked:
        // the smaller of what the batch still has and what the reservation item still needs
        _getProposedIssueQty: function (oRowData, fRemainingBatchQty) {
            var fPending = parseFloat(oRowData.pendingQty) || 0;
            return this._roundTo3Decimals(Math.min(fRemainingBatchQty, fPending));
        },

        // ==========================================
        // BATCH VALUE HELP
        // ==========================================

        onFromBatchValueHelp: function (oEvent) {
            this._oCurrentBatchRowContext = oEvent.getSource().getBindingContext("local");

            if (!this._oCurrentBatchRowContext) {
                MessageBox.error("Unable to identify selected row.");
                return;
            }

            var oRowData = this._oCurrentBatchRowContext.getObject();

            if (oRowData && oRowData.stockAvailable === false) {
                MessageBox.warning(
                    "Stock not available for material " +
                    (oRowData.material || "") +
                    ". Please delete this row."
                );
                return;
            }

            this._openBatchValueHelp();
        },

        _openBatchValueHelp: function () {
            var oRowData = this._oCurrentBatchRowContext.getObject();
            var oView = this.getView();

            if (!this._oBatchValueHelpDialog) {
                this._oBatchValueHelpDialog = new ValueHelpDialog({
                    title: "Select Batch",
                    supportMultiselect: false,
                    supportRanges: false,
                    key: "Batch",
                    descriptionKey: "ProductDescription",
                    ok: this._onBatchValueHelpOk.bind(this),
                    cancel: this._onBatchValueHelpCancel.bind(this),
                    afterClose: function () {
                        if (this._sPendingNextFocusPath) {
                            var sPath = this._sPendingNextFocusPath;
                            this._sPendingNextFocusPath = null;

                            setTimeout(function () {
                                this._focusNextFromBatchInput(sPath);
                            }.bind(this), 200);
                        }
                    }.bind(this)
                });

                oView.addDependent(this._oBatchValueHelpDialog);
            }

            var oDialog = this._oBatchValueHelpDialog;

            oDialog.getTableAsync().then(function (oTable) {
                oTable.setModel(oView.getModel());

                if (oTable.bindRows) {
                    oTable.destroyColumns();

                    oTable.addColumn(new UIColumn({
                        label: new Label({ text: "Material" }),
                        template: new Text({ text: "{Material}" })
                    }));
                    oTable.addColumn(new UIColumn({
                        label: new Label({ text: "Description" }),
                        template: new Text({ text: "{ProductDescription}" })
                    }));
                    oTable.addColumn(new UIColumn({
                        label: new Label({ text: "Quantity" }),
                        template: new Text({ text: "{QTY}" })
                    }));
                    oTable.addColumn(new UIColumn({
                        label: new Label({ text: "UoM" }),
                        template: new Text({ text: "{MaterialBaseUnit}" })
                    }));
                    oTable.addColumn(new UIColumn({
                        label: new Label({ text: "Issue Location" }),
                        template: new Text({ text: "{StorageLocation}" })
                    }));
                    oTable.addColumn(new UIColumn({
                        label: new Label({ text: "Sales Order" }),
                        template: new Text({ text: "{SDDocument}" })
                    }));
                    oTable.addColumn(new UIColumn({
                        label: new Label({ text: "Sales Order Item" }),
                        template: new Text({ text: "{SDDocumentItem}" })
                    }));
                    oTable.addColumn(new UIColumn({
                        label: new Label({ text: "Batch" }),
                        template: new Text({ text: "{Batch}" })
                    }));

                    oTable.bindRows({
                        path: "/ZI_GET_BATCHES_311E"
                    });

                    var aFilters = [];
                    if (oRowData.material) {
                        aFilters.push(new Filter("Material", FilterOperator.EQ, oRowData.material));
                    }
                    if (oRowData.plant) {
                        aFilters.push(new Filter("Plant", FilterOperator.EQ, oRowData.plant));
                    }
                    if (oRowData.salesOrder) {
                        aFilters.push(new Filter("SDDocument", FilterOperator.EQ, oRowData.salesOrder));
                    }
                    if (oRowData.salesOrderItem) {
                        aFilters.push(new Filter("SDDocumentItem", FilterOperator.EQ, oRowData.salesOrderItem));
                    }
                    if (oRowData.receivingLocation) {
                        aFilters.push(new Filter("StorageLocation", FilterOperator.EQ, oRowData.receivingLocation));
                    }

                    var oRowsBinding = oTable.getBinding("rows");
                    if (oRowsBinding) {
                        oRowsBinding.filter(aFilters);
                    }
                } else if (oTable.bindItems) {
                    oTable.destroyColumns();

                    oTable.addColumn(new MColumn({ header: new Label({ text: "Material" }) }));
                    oTable.addColumn(new MColumn({ header: new Label({ text: "Description" }) }));
                    oTable.addColumn(new MColumn({ header: new Label({ text: "Quantity" }) }));
                    oTable.addColumn(new MColumn({ header: new Label({ text: "Batch" }) }));
                    oTable.addColumn(new MColumn({ header: new Label({ text: "Sales Order" }) }));
                    oTable.addColumn(new MColumn({ header: new Label({ text: "SO Item" }) }));

                    oTable.bindItems({
                        path: "/ZI_GET_BATCHES_311E",
                        template: new ColumnListItem({
                            cells: [
                                new Text({ text: "{Material}" }),
                                new Text({ text: "{ProductDescription}" }),
                                new Text({ text: "{QTY}" }),
                                new Text({ text: "{Batch}" }),
                                new Text({ text: "{SDDocument}" }),
                                new Text({ text: "{SDDocumentItem}" })
                            ]
                        })
                    });

                    var aMobileFilters = [];
                    if (oRowData.material) {
                        aMobileFilters.push(new Filter("Material", FilterOperator.EQ, oRowData.material));
                    }
                    if (oRowData.plant) {
                        aMobileFilters.push(new Filter("Plant", FilterOperator.EQ, oRowData.plant));
                    }
                    if (oRowData.salesOrder) {
                        aMobileFilters.push(new Filter("SDDocument", FilterOperator.EQ, oRowData.salesOrder));
                    }
                    if (oRowData.salesOrderItem) {
                        aMobileFilters.push(new Filter("SDDocumentItem", FilterOperator.EQ, oRowData.salesOrderItem));
                    }

                    var oItemsBinding = oTable.getBinding("items");
                    if (oItemsBinding) {
                        oItemsBinding.filter(aMobileFilters);
                    }
                }

                oDialog.update();
                oDialog.open();
            });
        },

        _onBatchValueHelpOk: function () {
            var oDialog = this._oBatchValueHelpDialog;
            var oTable = oDialog.getTable();
            var oSelectedContext = null;

            if (oTable.getSelectedIndices) {
                var aSelectedIndices = oTable.getSelectedIndices();
                if (aSelectedIndices && aSelectedIndices.length > 0) {
                    oSelectedContext = oTable.getContextByIndex(aSelectedIndices[0]);
                }
            } else if (oTable.getSelectedItem) {
                var oSelectedItem = oTable.getSelectedItem();
                if (oSelectedItem) {
                    oSelectedContext = oSelectedItem.getBindingContext();
                }
            }

            if (!oSelectedContext || !this._oCurrentBatchRowContext) {
                MessageToast.show("Please select a batch");
                return;
            }

            var oSelectedData = oSelectedContext.getObject();
            var oLocalModel = this.getView().getModel("local");
            var sPath = this._oCurrentBatchRowContext.getPath();
            var oCurrentRow = oLocalModel.getProperty(sPath);

            var fRemainingBatchQty = this._getRemainingQtyForBatchSelection(oSelectedData, sPath);

            if (fRemainingBatchQty <= 0) {
                if (oTable.clearSelection) {
                    oTable.clearSelection();
                } else if (oTable.removeSelections) {
                    oTable.removeSelections(true);
                }

                MessageBox.warning("This batch is already fully used and cannot be selected again.", {
                    onClose: function () {
                        if (oDialog) {
                            oDialog.close();
                        }
                    }
                });

                return;
            }

            oLocalModel.setProperty(sPath + "/batch", oSelectedData.Batch || "");
            oLocalModel.setProperty(sPath + "/material", oSelectedData.Material || "");
            oLocalModel.setProperty(sPath + "/description", oSelectedData.ProductDescription || "");
            oLocalModel.setProperty(sPath + "/issuedQty", this._getProposedIssueQty(oCurrentRow, fRemainingBatchQty));
            oLocalModel.setProperty(sPath + "/maxIssuedQty", fRemainingBatchQty);
            oLocalModel.setProperty(sPath + "/uom", oSelectedData.MaterialBaseUnit || "");

            this._setToBatchForRow(sPath);
            this._sPendingNextFocusPath = sPath;

            oDialog.close();

            MessageToast.show("Batch / Quantity selected successfully");
        },

        _onBatchValueHelpCancel: function () {
            if (this._oBatchValueHelpDialog) {
                this._oBatchValueHelpDialog.close();
            }
        },

        onBatchChange: async function (oEvent) {
            var oInput = oEvent.getSource();
            var sBatch = oEvent.getParameter("value").trim();
            var oContext = oInput.getBindingContext("local");

            if (!oContext) {
                return;
            }

            var sPath = oContext.getPath();
            var oLocalModel = this.getView().getModel("local");
            var oRowData = oLocalModel.getProperty(sPath);

            if (!sBatch) {
                oLocalModel.setProperty(sPath + "/issuedQty", "");
                oLocalModel.setProperty(sPath + "/maxIssuedQty", "");
                oLocalModel.setProperty(sPath + "/uom", "");
                return;
            }

            await this._fetchBatchDetailsForRow(sPath, oRowData, sBatch);
        },

        // Quantity of the same batch + material already taken in OTHER rows of the table
        _getUsedQtyForBatch: function (sBatch, sMaterial, sCurrentPath) {
            var aRows = this.getView().getModel("local").getProperty("/scannedBatches") || [];
            var fUsedQty = 0;

            aRows.forEach(function (oRow, iIndex) {
                var sRowPath = "/scannedBatches/" + iIndex;
                var sRowBatch = (oRow.batch || "").trim();
                var sRowMaterial = (oRow.material || "").trim();

                if (
                    sRowPath !== sCurrentPath &&
                    sRowBatch !== "" &&
                    sBatch &&
                    sRowBatch === sBatch &&
                    (!sMaterial || sRowMaterial === sMaterial)
                ) {
                    fUsedQty += parseFloat(oRow.issuedQty) || 0;
                }
            });

            return fUsedQty;
        },

        _getRemainingQtyForBatchSelection: function (oBatchData, sCurrentPath) {
            var fAvailableQty = parseFloat(oBatchData.QTY) || 0;
            var fUsedQty = this._getUsedQtyForBatch(oBatchData.Batch, oBatchData.Material, sCurrentPath);
            var fRemainingQty = fAvailableQty - fUsedQty;

            return fRemainingQty > 0 ? fRemainingQty : 0;
        },

        _fetchBatchDetailsForRow: async function (sPath, oRowData, sBatch) {
            var oLocalModel = this.getView().getModel("local");

            var aFilters = [];
            aFilters.push("Batch eq '" + encodeURIComponent(sBatch) + "'");

            if (oRowData.material) {
                aFilters.push("Material eq '" + encodeURIComponent(oRowData.material) + "'");
            }
            if (oRowData.salesOrder) {
                aFilters.push("SDDocument eq '" + encodeURIComponent(oRowData.salesOrder) + "'");
            }
            if (oRowData.salesOrderItem) {
                aFilters.push("SDDocumentItem eq '" + encodeURIComponent(oRowData.salesOrderItem) + "'");
            }
            if (oRowData.receivingLocation) {
                aFilters.push("StorageLocation eq '" + encodeURIComponent(oRowData.receivingLocation) + "'");
            }
            if (oRowData.plant) {
                aFilters.push("Plant eq '" + encodeURIComponent(oRowData.plant) + "'");
            }

            var sServiceUrl =
                "/sap/opu/odata4/sap/zsb_pack_conf/srvd_a2x/sap/zsd_pack_conf/0001/ZI_GET_BATCHES_311E?$filter=" +
                aFilters.join(" and ");

            try {
                var oResponse = await fetch(sServiceUrl, {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    }
                });

                if (!oResponse.ok) {
                    throw new Error("HTTP status " + oResponse.status);
                }

                var oData = await oResponse.json();
                var aResults = oData.value || [];

                if (!aResults.length) {
                    oLocalModel.setProperty(sPath + "/issuedQty", "");
                    oLocalModel.setProperty(sPath + "/maxIssuedQty", "");
                    oLocalModel.setProperty(sPath + "/uom", "");
                    MessageToast.show("No details found for entered batch");
                    return;
                }

                var oBatch = aResults[0];
                var fRemainingBatchQty = this._getRemainingQtyForBatchSelection(oBatch, sPath);

                if (fRemainingBatchQty <= 0) {
                    oLocalModel.setProperty(sPath + "/batch", "");
                    oLocalModel.setProperty(sPath + "/issuedQty", "");
                    oLocalModel.setProperty(sPath + "/maxIssuedQty", "");
                    oLocalModel.setProperty(sPath + "/uom", "");
                    MessageBox.warning("This batch is already fully used and cannot be selected again.");
                    return;
                }

                oLocalModel.setProperty(sPath + "/issuedQty", this._getProposedIssueQty(oRowData, fRemainingBatchQty));
                oLocalModel.setProperty(sPath + "/maxIssuedQty", fRemainingBatchQty);
                oLocalModel.setProperty(sPath + "/uom", oBatch.MaterialBaseUnit || "");
                oLocalModel.setProperty(sPath + "/description", oBatch.ProductDescription || oRowData.description || "");
                this._setToBatchForRow(sPath);

                MessageToast.show("Batch details fetched successfully");

            } catch (oError) {
                oLocalModel.setProperty(sPath + "/issuedQty", "");
                oLocalModel.setProperty(sPath + "/maxIssuedQty", "");
                oLocalModel.setProperty(sPath + "/uom", "");
                MessageBox.error("Failed to fetch batch details");
                console.error("Batch fetch error:", oError);
            }
        },

        // ==========================================
        // QTY TO ISSUE (no split / no new rows)
        // ==========================================

        onIssuedQtyChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue().trim();
            var oContext = oInput.getBindingContext("local");
            var bLive = oEvent.getId() === "liveChange";

            if (!oContext) {
                return;
            }

            var sPath = oContext.getPath();
            var oLocalModel = this.getView().getModel("local");
            var oRow = oLocalModel.getProperty(sPath);

            if (sValue === "") {
                oInput.setValueState("None");
                oInput.setValueStateText("");
                if (!bLive) {
                    oLocalModel.setProperty(sPath + "/issuedQty", "");
                }
                return;
            }

            var fEnteredQty = parseFloat(sValue);

            if (isNaN(fEnteredQty) || fEnteredQty < 0) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Enter a valid numeric quantity");
                return;
            }

            // 1. Cannot exceed the reservation item's pending quantity
            var fPendingQty = parseFloat(oRow.pendingQty) || 0;
            if (fEnteredQty > fPendingQty) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Qty To Issue cannot be greater than Pending Qty (" + fPendingQty + ")");
                if (!bLive) {
                    MessageToast.show("Qty To Issue cannot be greater than Pending Qty (" + fPendingQty + ")");
                }
                return;
            }

            // 2. Cannot exceed what is left in the selected batch
            var fMaxBatchQty = parseFloat(oRow.maxIssuedQty);
            if (!isNaN(fMaxBatchQty) && fEnteredQty > fMaxBatchQty) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Qty To Issue cannot be greater than available batch quantity (" + fMaxBatchQty + ")");
                if (!bLive) {
                    MessageToast.show("Qty To Issue cannot be greater than available batch quantity");
                }
                return;
            }

            oInput.setValueState("None");
            oInput.setValueStateText("");

            // Round only when the user leaves the field, so typing decimals is not disturbed
            if (!bLive) {
                oLocalModel.setProperty(sPath + "/issuedQty", this._roundTo3Decimals(fEnteredQty));
            }
        },

        _focusNextFromBatchInput: function (sCurrentPath) {
            var oTable = this.byId("batchesTable");
            var aItems = oTable ? oTable.getItems() : [];

            if (!aItems.length) {
                return;
            }

            var iCurrentIndex = -1;

            aItems.some(function (oItem, iIndex) {
                var oCtx = oItem.getBindingContext("local");
                if (oCtx && oCtx.getPath() === sCurrentPath) {
                    iCurrentIndex = iIndex;
                    return true;
                }
                return false;
            });

            if (iCurrentIndex === -1 || iCurrentIndex + 1 >= aItems.length) {
                return;
            }

            // Find the "From Batch" input by its id instead of a fixed cell index
            var oNextFromBatchInput = aItems[iCurrentIndex + 1].getCells().find(function (oCell) {
                return oCell.getId().indexOf("_IDGenInput4") !== -1;
            });

            if (oNextFromBatchInput && oNextFromBatchInput.focus) {
                setTimeout(function () {
                    oNextFromBatchInput.focus();
                }, 100);
            }
        },

        // ==========================================
        // NEW / DELETE
        // ==========================================

        onNew: function () {
            var oView = this.getView();
            var oLocalModel = oView.getModel("local");
            var oTable = this.byId("batchesTable");

            oLocalModel.setData(this._getInitialData());
            oLocalModel.refresh(true);

            if (oTable) {
                oTable.removeSelections(true);
            }

            var oReservationInput = this.byId("inputReservation");
            if (oReservationInput) {
                oReservationInput.focus();
            }
        },

        onDeleteSelected: function () {
            var oTable = this.byId("batchesTable");
            var oLocalModel = this.getView().getModel("local");
            var aData = oLocalModel.getProperty("/scannedBatches") || [];
            var aSelectedItems = oTable.getSelectedItems();

            if (!aSelectedItems.length) {
                MessageBox.warning("Please select at least one line item to delete.");
                return;
            }

            MessageBox.confirm("Are you sure you want to delete the selected line item(s)?", {
                title: "Confirm Deletion",
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                initialFocus: MessageBox.Action.CANCEL,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        var aIndexesToDelete = aSelectedItems.map(function (oItem) {
                            var sPath = oItem.getBindingContext("local").getPath();
                            return parseInt(sPath.split("/").pop(), 10);
                        });

                        var aNewData = aData.filter(function (oItem, iIndex) {
                            return aIndexesToDelete.indexOf(iIndex) === -1;
                        });

                        oLocalModel.setProperty("/scannedBatches", aNewData);
                        oLocalModel.refresh(true);

                        oTable.removeSelections(true);

                        MessageToast.show("Selected line item(s) deleted successfully.");
                    }
                }
            });
        },

        // ==========================================
        // CONTRACTOR VALUE HELP
        // ==========================================

        onContractorValueHelp: function () {
            var oView = this.getView();
            var oLocalModel = oView.getModel("local");
            var sHeaderPlant = oLocalModel.getProperty("/selection/headerPlant") || "";

            if (!sHeaderPlant) {
                MessageBox.warning("Please select a valid reservation to populate the Header Plant first.");
                return;
            }

            if (!this._oContractorValueHelpDialog) {
                this._oContractorValueHelpDialog = new ValueHelpDialog({
                    title: "Select Contractor Name",
                    supportMultiselect: false,
                    supportRanges: false,
                    key: "MasterName",
                    descriptionKey: "MasterName",
                    ok: this._onContractorValueHelpOk.bind(this),
                    cancel: function () {
                        this._oContractorValueHelpDialog.close();
                    }.bind(this)
                });

                oView.addDependent(this._oContractorValueHelpDialog);
            }

            var oDialog = this._oContractorValueHelpDialog;

            oDialog.getTableAsync().then(function (oTable) {
                oTable.setModel(oView.getModel());

                if (oTable.bindRows) {
                    oTable.destroyColumns();

                    oTable.addColumn(new UIColumn({
                        label: new Label({ text: "Master Name" }),
                        template: new Text({ text: "{MasterName}" })
                    }));
                    oTable.addColumn(new UIColumn({
                        label: new Label({ text: "Operation" }),
                        template: new Text({ text: "{Operation}" })
                    }));
                    oTable.addColumn(new UIColumn({
                        label: new Label({ text: "Plant" }),
                        template: new Text({ text: "{Plant}" })
                    }));

                    var aFilters = [
                        new Filter("Plant", FilterOperator.EQ, sHeaderPlant),
                        new Filter({
                            filters: [
                                new Filter("Operation", FilterOperator.EQ, "SET PACKIN"),
                                new Filter("Operation", FilterOperator.EQ, "BOX PACKIN"),
                                new Filter("Operation", FilterOperator.EQ, "CUT TO PAC")
                            ],
                            and: false
                        })
                    ];

                    oTable.bindRows({
                        path: "/ZR_WORK_MASTER_MAP",
                        filters: aFilters
                    });
                }

                oDialog.update();
                oDialog.open();
            });
        },

        _onContractorValueHelpOk: function () {
            var oDialog = this._oContractorValueHelpDialog;
            var oTable = oDialog.getTable();
            var oSelectedContext = null;

            if (oTable.getSelectedIndices) {
                var aSelectedIndices = oTable.getSelectedIndices();
                if (aSelectedIndices && aSelectedIndices.length > 0) {
                    oSelectedContext = oTable.getContextByIndex(aSelectedIndices[0]);
                }
            } else if (oTable.getSelectedItem) {
                var oSelectedItem = oTable.getSelectedItem();
                if (oSelectedItem) {
                    oSelectedContext = oSelectedItem.getBindingContext();
                }
            }

            if (!oSelectedContext) {
                MessageToast.show("Please select a contractor");
                return;
            }

            var oSelectedData = oSelectedContext.getObject();
            var oLocalModel = this.getView().getModel("local");

            oLocalModel.setProperty("/selection/contractorName", oSelectedData.MasterName || "");

            oDialog.close();
            MessageToast.show("Contractor selected successfully");
        },

        // ==========================================
        // SUBMIT
        // ==========================================

        onSubmit: function () {
            var oView = this.getView();
            var oLocalModel = oView.getModel("local");
            var oODataModel = oView.getModel();
            var that = this;

            var oSelection = oLocalModel.getProperty("/selection");
            var aScannedBatches = oLocalModel.getProperty("/scannedBatches") || [];

            if (!oSelection.reservation || !oSelection.postingDate) {
                MessageBox.error("Please fill Reservation Number and Posting Date before submitting.");
                return;
            }

            if (aScannedBatches.length === 0) {
                MessageBox.error("No reservation items available to submit.");
                return;
            }

            var aItemsToSubmit = aScannedBatches.filter(function (oItem) {
                var fIssuedQty = parseFloat(String(oItem.issuedQty || "").trim());
                return !isNaN(fIssuedQty) && fIssuedQty > 0;
            });

            if (aItemsToSubmit.length === 0) {
                MessageBox.error("Please enter Qty To Issue for at least one item before submitting.");
                return;
            }

            var aInvalidItems = aItemsToSubmit.filter(function (oItem) {
                return !oItem.material || !oItem.plant || !oItem.receivingLocation;
            });

            if (aInvalidItems.length > 0) {
                MessageBox.error("Please fill Material, Plant, and Receiving Location for all items.");
                return;
            }

            // Qty To Issue must not exceed Pending Qty
            var aOverPending = aItemsToSubmit.filter(function (oItem) {
                return parseFloat(oItem.issuedQty) > (parseFloat(oItem.pendingQty) || 0);
            });

            if (aOverPending.length > 0) {
                MessageBox.error(
                    "Qty To Issue cannot be greater than Pending Qty for:\n\n" +
                    aOverPending.map(function (oItem) {
                        return "Reservation Item " + oItem.reservation_item +
                            " | Material " + oItem.material +
                            " | Qty To Issue " + oItem.issuedQty +
                            " | Pending " + oItem.pendingQty;
                    }).join("\n")
                );
                return;
            }

            // Qty To Issue must not exceed the available batch quantity
            var aInvalidQty = aItemsToSubmit.filter(function (oItem) {
                var fIssued = parseFloat(oItem.issuedQty);
                var fMax = parseFloat(oItem.maxIssuedQty);
                return !isNaN(fIssued) && !isNaN(fMax) && fIssued > fMax;
            });

            if (aInvalidQty.length > 0) {
                MessageBox.error("Qty To Issue cannot be greater than the available batch quantity.");
                return;
            }

            var oDateFormat = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
            var sFormattedDate = oDateFormat.format(oSelection.postingDate);
            var sReservation = String(oSelection.reservation).padStart(10, "0");

            var aItemsPayload = aItemsToSubmit.map(function (oItem) {
                return {
                    "ReservationItem": (oItem.reservation_item || "").padStart(4, "0"),
                    "Material": oItem.material || "",
                    "Batch": oItem.batch || "",
                    "MatDescription": oItem.description || "",
                    "ReqQty": String(oItem.requiredQty || ""),
                    "Unit": oItem.reqUom || "",
                    "IssuedQty": String(oItem.issuedQty || ""),
                    // "IssuedUnit": oItem.uom || "",
                    "IssuedUnit": oItem.uom || oItem.reqUom || "",
                    "Plant": oItem.plant || "",
                    "ToBatch": oItem.toBatch || "",
                    "ProdOrd": (oItem.productionOrder || "").padStart(12, "0"),
                    "ReceiveLoc": oItem.receivingLocation || "",
                    "SalesOrder": (oItem.salesOrder || "").padStart(10, "0"),
                    "SalesOrderItem": (oItem.salesOrderItem || "").padStart(6, "0")
                };
            });

            var oPayload = {
                "Reservation": sReservation,
                "PostingDate": sFormattedDate,
                "ContractorName": oSelection.contractorName,
                "ProdOrd": oSelection.productionOrder,
                "LotNum": oSelection.lotNumber,
                "_Item": aItemsPayload
            };

            console.log("Submit payload:", JSON.stringify(oPayload, null, 2));

            oView.setBusy(true);

            var oListBinding = oODataModel.bindList("/ZC_PACK_CONF_HD");
            var oContext = oListBinding.create(oPayload);

            oContext.created().then(function () {
                oView.setBusy(false);

                var sMatDoc = (oContext.getProperty("Materialdocument") || "").trim();
                var sMessage = (oContext.getProperty("Mess") || "").trim();

                if (sMatDoc) {
                    MessageBox.success(
                        "Material Document " + sMatDoc + " created successfully.",
                        {
                            onClose: function () {
                                oLocalModel.setData(that._getInitialData());

                                var oReservationInput = oView.byId("inputReservation");
                                if (oReservationInput) {
                                    oReservationInput.focus();
                                }
                            }
                        }
                    );
                } else {
                    MessageBox.error(sMessage || "Material document was not created.");
                }

            }).catch(function (oError) {
                oView.setBusy(false);

                var sErrorMsg = "Failed to submit transfer posting.";
                if (oError && oError.message) {
                    sErrorMsg = oError.message;
                }

                MessageBox.error(sErrorMsg);
                console.error("Submit error:", oError);
            });
        }

    });
});