import { LightningElement } from 'lwc';
import doQuery from '@salesforce/apex/AlchemyServices.doQuery';
import userId from '@salesforce/user/Id';

export default class TrackerDisplay extends LightningElement {

    startTime;
    endTime;
    acceptableDrinkLevel = 7;
    drinksRemaining;
    drinksIcon = 'utility:food_and_drink';
    exerciseIcon = 'utility:macros';
    behaviorIcon = 'utility:magicwand';
    behaviorTypes;
    drinksTextColorClasses;
    exerciseLogged;
    otherBehaviorLogged;

    connectedCallback() {
        this.generateDates();
        this.getDrinkRecords();
        this.getExerciseRecords();
        this.getBehaviorRecords();
        this.getBehaviorTypes();
    }

    getDrinkRecords() {
        let soql = `SELECT Id, Description__c FROM Drink__c WHERE CreatedDate > ${this.startTime} AND CreatedDate < ${this.endTime} AND CreatedById = '${userId}'`;
        doQuery({soql: soql})
            .then(result => {
                this.drinksRemaining = this.acceptableDrinkLevel - JSON.parse(JSON.stringify(result)).length;
                if (this.drinksRemaining > 5) {
                    this.drinksTextColorClasses = 'slds-page-header__title slds-truncate slds-text-color_success';
                } else if (this.drinksRemaining > 2) {
                    this.drinksTextColorClasses = 'slds-page-header__title slds-truncate slds-text-color_default';
                } else {
                    this.drinksTextColorClasses = 'slds-page-header__title slds-truncate slds-text-color_error';
                }
                console.log('drinksRemaining', this.drinksRemaining);
            })
            .catch(error => {
                console.log('there was a drink query error', error);
            })
    }
        
    getExerciseRecords() {
        let soql = `SELECT Id FROM Exercise__c WHERE CreatedDate > ${this.startTime} AND CreatedDate < ${this.endTime} AND CreatedById = '${userId}'`;
        doQuery({soql: soql})
            .then(result => {
                this.exerciseLogged = JSON.parse(JSON.stringify(result)).length;
            })
            .catch(error => {
                console.log('there was an exercise query error', error);
            })
    }

    getBehaviorRecords() {
        let soql = `SELECT Id FROM Behavior__c WHERE CreatedDate > ${this.startTime} AND CreatedDate < ${this.endTime} AND CreatedById = '${userId}'`;
        doQuery({soql: soql})
            .then(result => {
                this.otherBehaviorLogged = JSON.parse(JSON.stringify(result)).length;
            })
            .catch(error => {
                console.log('there was a behavior query error', error);
            })
    }
        
    getBehaviorTypes() {
        let soql = `SELECT Id, Name FROM Behavior_Type__c WHERE OwnerId = '${userId}'`;
        doQuery({soql: soql})
            .then(result => {
                console.log('behaviorTypes', result);
                this.behaviorTypes = JSON.parse(JSON.stringify(result));
            })
            .catch(error => {
                console.log('there was a behavior query error', error);
            })
            
    }

    generateDates() {
        let today = new Date();
        let startingPosition = 1; // Identifies the beginning of the one week period. 0 = Sunday, 1 = Monday, etc.
        let dayOfWeek = today.getDay();
        let dayOffset = this.generateDateOffset(startingPosition, dayOfWeek);
        let startOfWeek = this.generateSpecificDate(today, dayOffset);
        let endOfWeek = this.generateSpecificDate(startOfWeek, 7); // 7 is the offset since we're looking for a one-week time-frame from the previous Monday
        this.displayedDate = this.convertJsDateToDateString(today);
        this.startTime = this.convertToDateTimeString(startOfWeek);
        this.endTime = this.convertToDateTimeString(endOfWeek);
    }

    generateDateOffset(startingPosition, dayOfWeek) {
        // Since the week will start on Monday in this scenario, we need to check if today's date is sunday so our offset can go back to the previous monday.
        let offset;
        if (dayOfWeek > 0) {
            offset = startingPosition - dayOfWeek;
        } else {
            offset = -6;
        }
        return offset;
    }

    generateSpecificDate(date, offset) {
        let nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + offset);
        return nextDay;
    }

    convertJsDateToDateString(date) {
        let dd = date.getDate();
        let mm = date.getMonth()+1; 
        let yyyy = date.getFullYear();
        if (dd < 10) {
            dd = '0' + dd;
        } 
        if (mm < 10) {
            mm = '0' + mm;
        } 
        date = yyyy + '-' + mm + '-' + dd;
        return date;
    }

    convertToDateTimeString(date) {
        let hourOffset = date.getTimezoneOffset();
        hourOffset = hourOffset / 60;
        if (hourOffset < 10) {
            hourOffset = '0' + hourOffset;
        }
        let dateTimeString = this.convertJsDateToDateString(date) + 'T00:00:00-' + hourOffset + '00';
        return dateTimeString;
    }
}