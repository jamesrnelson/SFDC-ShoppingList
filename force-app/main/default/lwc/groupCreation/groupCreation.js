import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAllUniquePairs from '@salesforce/apex/ParticipantServices.getAllUniquePairs';
import doQuery from '@salesforce/apex/ParticipantServices.doQuery';
import getNumberOfActiveParticipants from '@salesforce/apex/ParticipantServices.getNumberOfActiveParticipants';
import getExistingGroupsWithParticipants from '@salesforce/apex/ParticipantServices.getExistingGroupsWithParticipants';
import createRecords from '@salesforce/apex/ParticipantServices.createRecords';
import doUpdate from '@salesforce/apex/ParticipantServices.doUpdate';

export default class GroupCreation extends LightningElement {
    @api recordId;
    relatedListIcon = "utility:food_and_drink";
    allUniquePairs;
    activeParticipants;
    numberOfActiveParticipants;
    existingGroups;
    groupsExist = false;
    groupGenerationCheckbox = false;
    
    groups = {};
    displayGroups = false;
    groupArray;

    connectedCallback() {
        this.getExistingGroups();
        this.getGroupGenerationCheckbox();
    }

    getExistingGroups() {
        getExistingGroupsWithParticipants({sessionId: this.recordId})
            .then(result => {
                let existingGroups = JSON.parse(result);
                if (existingGroups.length > 0) {
                    this.groupArray = [];
                    this.groupsExist = true;
                    for (let i in existingGroups) {
                        let modifiedGroup = {
                            id: existingGroups[i].Name,
                            names: [],
                            ids: []
                        }
                        for (let j in existingGroups[i].Group_Participants__r.records) {
                            modifiedGroup.names.push(existingGroups[i].Group_Participants__r.records[j].Participant__r.Name);
                            modifiedGroup.ids.push(existingGroups[i].Group_Participants__r.records[j].Participant__c);
                        }
                        this.groupArray.push(modifiedGroup);
                    }
                    this.displayGroups = true;
                }
            })
            .catch(error => {
                console.log('error getting groups', error);
            })
    }

    createGroups() {
        let groupNum = this.template.querySelector(".groupInput").value;
        let peopleNum = this.template.querySelector(".peopleInput").value;
        getNumberOfActiveParticipants()
            .then((result) => {
                let participantArray = JSON.parse(result);
                this.activeParticipants = participantArray.reduce((acc,curr)=> (acc[curr.Id]=curr,acc),{});
                this.numberOfActiveParticipants = participantArray.length;
                getAllUniquePairs()
                    .then((result) => {
                        this.allUniquePairs = JSON.parse(result);
                        this.doGroupCreationAndAssignment(groupNum, peopleNum);
                    })
                    .catch((error) => {
                        console.log('there was an error getting uniqe pairs', error);
                    });
            })
            .catch((error) => {
                console.log('there was an error getting active participants', error);
            }); 

    }

    doGroupCreationAndAssignment(groupNum, peopleNum) {
        this.groups = this.generateGroups(groupNum, peopleNum);
        console.log('this.groups', this.groups);
        let groupLength = Object.keys(this.groups).length;
        let pairIndex = 0;
        let groupIndex = 1;
        while (groupIndex <= groupLength && pairIndex < this.allUniquePairs.length) {
            let uniquePair = this.allUniquePairs[pairIndex];
            /*
                If none of the groups have the participant key yet, then add to the current group.
            */
            if(
                this.activeParticipants.hasOwnProperty(uniquePair.Participant_1__c) &&
                this.activeParticipants.hasOwnProperty(uniquePair.Participant_2__c) &&
                this.groups[groupIndex].capacity >= 2
            ) {
                this.groups[groupIndex][uniquePair.Participant_1__c] = uniquePair.Participant_1__r.Name;
                this.groups[groupIndex][uniquePair.Participant_2__c] = uniquePair.Participant_2__r.Name;
                this.groups[groupIndex].names.push(uniquePair.Participant_1__r.Name);
                this.groups[groupIndex].names.push(uniquePair.Participant_2__r.Name);
                this.groups[groupIndex].ids.push(uniquePair.Participant_1__c);
                this.groups[groupIndex].ids.push(uniquePair.Participant_2__c);
                this.groups[groupIndex].capacity -= 2;
                delete this.activeParticipants[uniquePair.Participant_1__c];
                delete this.activeParticipants[uniquePair.Participant_2__c];

                // add the unique pair to the unique pair array to update. increment the count on the unique pair
            } else if (
                this.activeParticipants.hasOwnProperty(uniquePair.Participant_1__c) &&
                this.activeParticipants.hasOwnProperty(uniquePair.Participant_2__c) &&
                this.groups[groupIndex].capacity < 2
            ){
                pairIndex++;
                continue;
            } else if (
                this.groups[groupIndex].hasOwnProperty(uniquePair.Participant_1__c) &&
                this.activeParticipants.hasOwnProperty(uniquePair.Participant_2__c) &&
                this.groups[groupIndex].capacity >= 1
            ) {
                this.groups[groupIndex][uniquePair.Participant_2__c] = uniquePair.Participant_2__r.Name;
                this.groups[groupIndex].names.push(uniquePair.Participant_2__r.Name);
                this.groups[groupIndex].ids.push(uniquePair.Participant_2__c);
                this.groups[groupIndex].capacity -= 1;
                delete this.activeParticipants[uniquePair.Participant_2__c];

            } else if (
                this.groups[groupIndex].hasOwnProperty(uniquePair.Participant_2__c) &&
                this.activeParticipants.hasOwnProperty(uniquePair.Participant_1__c) &&
                this.groups[groupIndex].capacity >= 1
            ) {
                this.groups[groupIndex][uniquePair.Participant_1__c] = uniquePair.Participant_1__r.Name;
                this.groups[groupIndex].names.push(uniquePair.Participant_1__r.Name);
                this.groups[groupIndex].ids.push(uniquePair.Participant_1__c);
                this.groups[groupIndex].capacity -= 1;
                delete this.activeParticipants[uniquePair.Participant_1__c];
            }
            
            if (this.groups[groupIndex].capacity <=0) {
                groupIndex++;
            }

            pairIndex++;
        }
        this.displayGroups = true;
        this.groupArray = Object.values(this.groups);
        console.log('groups after while loop', this.groups);
    }

    generateGroups(groupNum, peopleNum) {
        if (groupNum && peopleNum && groupNum > 0 && peopleNum > 0) {
            this.showCustomToast(
                'Data Error',
                "You can only select the number of groups OR the number of people you'd like in a group. Zero out one value and click again.",
                "error",
                "sticky"
            )
            return;
        }
        if (peopleNum && peopleNum > 0) {
            groupNum = Math.floor(this.numberOfActiveParticipants / peopleNum);
        }
        let activeParticipants = this.numberOfActiveParticipants;
        let standardGroupCapacity = Math.floor(activeParticipants / groupNum);
        let numGroupsWithOneMore = activeParticipants % groupNum;
        let groupCreation = {};
        for (let i = 1; i < parseInt(groupNum,10) + 1; i++) {
            let thisGroupCapacity = i <= numGroupsWithOneMore ? standardGroupCapacity + 1 : standardGroupCapacity;
            groupCreation[i] = {
                id: i,
                capacity: thisGroupCapacity,
                names: [],
                ids: []
            };
        }
        return groupCreation;
    }

    getGroupGenerationCheckbox() {
        let soql = `SELECT Id, Groups_Generated_Automatically__c FROM Session__c WHERE Id = '${this.recordId}'`;
        doQuery({soql})
            .then(result => {
                let sessions = JSON.parse(JSON.stringify(result));
                let session = sessions.length > 0 ? sessions[0] : undefined;
                if (session) {
                    this.groupGenerationCheckbox = session.Groups_Generated_Automatically__c;
                }
            })
            .catch(error => {
                console.log('error getting session groups generated checkbox', error);
            })
    }

    handleCreate() {
        const groupArray = Object.keys(this.groups).map(i => this.groups[i]);
        createRecords({
            recordsToCreate: JSON.stringify(groupArray),
            sessionId: this.recordId
        }).then(() => {
                this.groupsExist = true;
                this.updateUniquePairsWithNewCount();
            })
            .catch(error => {
                console.log('error creating groups and group participants', error);
            })
    }

    handleCountUpdate() {
        getAllUniquePairs()
            .then((result) => {
                this.allUniquePairs = JSON.parse(result);
                console.log('this.allUniquePairs on update', this.allUniquePairs)
                this.transformGroupArrayForCountUpdate();
                this.updateUniquePairsWithNewCount();
            })
            .catch((error) => {
                console.log('there was an error getting uniqe pairs', error);
            });
    }

    updateUniquePairsWithNewCount() {
        let uniquePairMap = this.createUniquePairMap();
        let pairsToUpdate = this.identifyUniquePairs();

        let retrievedPairs = [];
        let updateArray = Object.keys(pairsToUpdate);
        for (let i in updateArray) {
            uniquePairMap[updateArray[i]].Count__c++;
            retrievedPairs.push(uniquePairMap[updateArray[i]]);
        }
        doUpdate({recordsToUpdate: JSON.stringify(retrievedPairs)})
            .then(result => {
                console.log('result', result);
                this.showCustomToast('Success', 'Unique Pair count updated to reflect these groups', 'success', 'dismissible')
                this.updateSessionGroupGeneratedCheckbox();
            })
            .catch(error => {
                console.log('error updating unique pairs')
            })
    }

    transformGroupArrayForCountUpdate() {
        for (let i in this.groupArray) {
            this.groups[this.groupArray[i].id] = this.groupArray[i];
        }
    }

    updateSessionGroupGeneratedCheckbox() {
        let sessionArray = [{
            "attributes": {
                "type": "Session__c"
            },
            "id": this.recordId,
            "Groups_Generated_Automatically__c": true
        }];
        doUpdate({recordsToUpdate: JSON.stringify(sessionArray)})
            .then(result => {
                console.log('result', result);
                this.groupGenerationCheckbox = true;
            })
            .catch(error => {
                console.log('error updating session', error);
            })
    }

    createUniquePairMap() {
        const reducer = (accumulator, currentValue) => {
            let key = currentValue.Participant_1__c < currentValue.Participant_2__c ?
                currentValue.Participant_1__c + currentValue.Participant_2__c :
                currentValue.Participant_2__c + currentValue.Participant_1__c;
            accumulator[key] = currentValue;

            return accumulator;
        };
        let uniquePairMap = this.allUniquePairs.reduce(reducer,{});
        return uniquePairMap;
    }

    identifyUniquePairs() {
        let pairsToUpdate = {};
        for (let i in this.groups) {
            for (let j = 0; j < this.groups[i].ids.length - 1; j++) {
                for (let k = j + 1; k < this.groups[i].ids.length; k++) {
                    let el1 = this.groups[i].ids[j];
                    let el2 = this.groups[i].ids[k]
                    let key = el1 < el2 ? el1 + el2 : el2 + el1; 
                    pairsToUpdate[key] = null;
                }
            }
        }
        return pairsToUpdate;
    }

    handleCancel() {
        this.displayGroups = false;
    }
    
    showCustomToast(title, message, variant, mode) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant,
                mode: mode
            })
        );
    }
}