import {Component, OnInit, EventEmitter, Input, Output} from '@angular/core';
import {Observable, Subject} from 'rxjs/Rx';
import {ArmService} from '../../services/arm.service';
import {SiteDescriptor} from '../../common/resourceDescriptors';
import {PopOverComponent} from '../pop-over.component';
import {FeatureGroup} from './feature-group';
import {FeatureItem} from './feature-item';

@Component({
    selector: 'feature-group',
    templateUrl: 'app/components/feature-group/feature-group.component.html',
    directives: [PopOverComponent],
    inputs : ['inputGroup', 'searchTerm']
})

export class FeatureGroupComponent {

    public filteredFeatures : FeatureItem[];
    public group : FeatureGroup;

    constructor(){}

    set inputGroup(group : FeatureGroup){
        this.group = group;
        this.filteredFeatures = this.group.features;
    }

    set searchTerm(term : string){
        if(!term){
            this.filteredFeatures = this.group.features;
        }

        let features : FeatureItem[] = [];
        this.group.features.forEach(feature =>{
            if(feature.keywords.toLowerCase().indexOf(term.toLowerCase()) > -1){
                features.push(feature);
            }
        })

        this.filteredFeatures = features;
    }

    click(feature : FeatureItem){
        feature.click();
    }
}