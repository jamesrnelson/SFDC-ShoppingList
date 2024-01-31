import { LightningElement, api, track } from 'lwc';
import getRelatedListRecords from '@salesforce/apex/InlineEditableRelatedListController.getRelatedListRecords';
import getChildObjectInfo from '@salesforce/apex/InlineEditableRelatedListController.getChildObjectInfo';
import doesUserHavePermission from '@salesforce/apex/RetrieveRecordsController.doesUserHavePermission';
import doQuery from '@salesforce/apex/RetrieveRecordsController.doQuery';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { updateRecord } from 'lightning/uiRecordApi';
import USER_ID from '@salesforce/user/Id';

export default class InlineEditableRelatedList extends LightningElement {

    @api recordId;
    @api relatedListName;
    @api relatedListIcon;
    @api childRelationshipName;
    @api childObjectApiName;
    @api recordType;
    @api numberOfRecordsToDisplay = 15;
    @api parentLookupField;
    @api overrideRelatedListQuery = false;
    @api alternateQuery;
    @api column1;
    @api column2;
    @api column3;
    @api column4;
    @api column5;
    @api column6;
    @api column7;
    @api column8;

    @api column1LinkOverride;
    @api column1LinkedRecord;
    @api column1LinkedObject;
    @api column2LinkOverride;
    @api column2LinkedRecord;
    @api column2LinkedObject;
    
    @track filteredColumns = [];
    @track columnWidth;
    @track relatedListRecords = [];
    @track recordsToDisplay = [];
    @track showObjectModal = false;
    @track childObjectName;
    @track columnLabels = {};
    @track retRecordsLength = 0;
    @track isEditable = false;
    @track labelVariant;
    timeoutId;
    recordsToUpdate = {};
    sortedColumn;
    sortDirection = 'ascending';
    
    connectedCallback(){
        if (this.overrideRelatedListQuery) {
            this.makeDynamicQuery(this.alternateQuery);
        } else {
        getRelatedListRecords({
            recordId : this.recordId,
            columns : [this.column1, this.column2, this.column3, this.column4, this.column5,
                        this.column6, this.column7, this.column8, this.column1LinkedRecord, this.column2LinkedRecord],
            childRelationshipName : this.childRelationshipName
        }).then(result => {
            let response = JSON.parse(result)[0][this.childRelationshipName];
                if (response !== undefined) {
                    this.assignQueriedRecordsToJsObject(response.records);
                };
            }).catch(error => {
                this.showErrorToast(error);
                console.log('error', error);
            })
        }
    }

    renderedCallback() {
        let box = this.template.querySelector('div.container-identifier');
        this.labelVariant = box.offsetWidth > 970 ? "label-hidden" : "label-stacked";
    }

    assignQueriedRecordsToJsObject(records) {
        records.forEach(record => {
            let recordObj = {
                Id: record.Id,
                column1 : record[this.column1],
                column2 : record[this.column2],
                column3 : record[this.column3],
                column4 : record[this.column4],
                column5 : record[this.column5],
                column6 : record[this.column6],
                column7 : record[this.column7],
                column8 : record[this.column8],
                column1Link : record[this.column1LinkedRecord],
                column2Link : record[this.column2LinkedRecord]
            }
            this.relatedListRecords.push(recordObj);
        })
            
        if(this.relatedListRecords.length > 0){
            getChildObjectInfo({
                recordId : this.relatedListRecords[0].Id, 
                columns : [this.column1, this.column2, this.column3, this.column4, 
                            this.column5, this.column6, this.column7, this.column8]})
            .then(result => {
                let info = JSON.parse(result);
                this.filteredColumns = info.columnLabels;
                this.getUserPermission("Inline_Editable_Related_List_User");
                this.getNumberOfColumns();
                for (let i in info.columnLabels){
                    let key = "column" + i;
                    this.columnLabels[key] = info.columnLabels[i];
                }
            })
        }
        this.recordsToDisplay = this.relatedListRecords.slice(0, this.numberOfRecordsToDisplay);
        this.retRecordsLength = this.relatedListRecords.length;
    }

    @api makeDynamicQuery(query) {
        this.relatedListRecords = [];
        doQuery({
            soql : query
        }).then(result => {
            this.assignQueriedRecordsToJsObject(JSON.parse(result));
        }).catch(error => {
            this.showErrorToast(error);
        })
    }

    getNumberOfColumns() {
        let size = this.filteredColumns.length;
        this.columnWidth = "slds-col slds-size_1-of-1 slds-large-size_1-of-" + size;
    }

    showErrorToast(error){
        let message;
        if (error.body && error.body.message){
            message = error.body.message;
        } else {
            message = JSON.stringify(error);
        }
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: message,
                variant: 'error',
            })
        );
    }

    handleOnChange(event) {
        clearTimeout(this.timeoutId);
        
        const fieldName = event.target.fieldName;
        const value = event.target.value;
        const dataId = event.target.parentNode.parentNode.parentNode.getAttribute("data-id");

        if (this.recordsToUpdate[dataId] == null) {
            this.recordsToUpdate[dataId] = {
                fields : {
                    Id : dataId
                }
            };
        }
        this.recordsToUpdate[dataId].fields[fieldName] = value;

        /* eslint-disable */
        this.timeoutId = setTimeout(this.updateGenericRecords.bind(this), 500);
    }

    handleSort(event){
        const clickedColumn = event.target.value
        this.sortRecords(clickedColumn);
    }
    
    sortRecords(clickedColumn){
        if (this.sortedColumn == clickedColumn && this.sortDirection == 'ascending') {
            this.sortDirection = 'descending'
        } else {
            this.sortDirection = 'ascending'
        }
        this.sortedColumn = clickedColumn;
        let array = JSON.parse(JSON.stringify(this.relatedListRecords));
        array.sort((a,b) => {
            if (this.sortDirection == 'ascending') {
                if (a[this.sortedColumn] === undefined) {
                    return -1;
                } else if (b[this.sortedColumn] === undefined) {
                    return 1;
                } else {
                    return a[this.sortedColumn] < b[this.sortedColumn] ? -1 : a[this.sortedColumn] > b[this.sortedColumn] ? 1 : 0
                }
            } else if (this.sortDirection == 'descending') {
                if (a[this.sortedColumn] === undefined) {
                    return 1;
                } else if (b[this.sortedColumn] === undefined) {
                    return -1;
                } else {
                    return a[this.sortedColumn] > b[this.sortedColumn] ? -1 : a[this.sortedColumn] < b[this.sortedColumn] ? 1 : 0
                }
            }
        })
        this.relatedListRecords = array;
        this.recordsToDisplay = array;
    }

    getUserPermission(customPermissionName) {
        doesUserHavePermission({ userId: USER_ID, permissionName: customPermissionName })
            .then(result => {
                this.isEditable = result;            
            }).catch(error => {
                console.log('getUserPermission.error --> ', error);
                this.showErrorToast(error);
            })

    }

    updateGenericRecords() {
        Object.values(this.recordsToUpdate).forEach(record => {
            updateRecord(record)
                .then(() => {
                })
                .catch(error => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Error updating project record',
                            message: error.body.message,
                            variant: 'error',
                        }),
                    );
                });
        });
        this.recordsToUpdate = {};
    }

    handleViewAll() {
        this.recordsToDisplay = this.relatedListRecords;
    }
}