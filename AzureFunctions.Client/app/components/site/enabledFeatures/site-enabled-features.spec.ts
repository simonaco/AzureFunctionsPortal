/// <reference path='../../../../typings/browser.d.ts' />
import {LocalStorageService as StorageService} from '../../../services/local-storage.service';
import {Observable, Subscription as RxSubscription, Subject, ReplaySubject} from 'rxjs/Rx';
import {Storage, StorageItems, StorageItem} from '../../../models/localStorage/local-storage';
import {SiteEnabledFeaturesComponent} from './site-enabled-features.component';
import {Feature, EnabledFeature, EnabledFeatureItem} from '../../../models/localStorage/enabled-features';

describe('Local Storage tests', () =>{
    let storageService : StorageService;
    let service : any;
    let featuresComponent : SiteEnabledFeaturesComponent;
    let feature1 : EnabledFeatureItem;
    let feature2a : EnabledFeatureItem;
    let feature2b : EnabledFeatureItem;
    let feature3 : EnabledFeatureItem;

    let component : any;
    let fakeStorageItem : StorageItem;
    let site : any;

    beforeEach(() =>{
        site = {
            id : "id"
        }

        storageService = new StorageService();
        service = <any>storageService;

        featuresComponent = new SiteEnabledFeaturesComponent(null, storageService);
        component = <any>featuresComponent;
        component._site = site;

        feature1 = <EnabledFeatureItem>{
            feature : Feature.DeploymentSource,
            title : 'DeploymentSource1',
            isBlade : false,
            componentName : 'deployment-source'
        }

        feature2a = <EnabledFeatureItem>{
            feature : Feature.WebJobs,
            title : 'WebJobs1',
            isBlade : true,
            componentName : 'webjobs'
        }

        feature2b = <EnabledFeatureItem>JSON.parse(JSON.stringify(feature2a));
        feature2b.title = 'WebJobs2';

        feature3 = <EnabledFeatureItem>{
            feature : Feature.Backups,
            title : 'Backups1',
            isBlade : false,
            componentName : 'backups'
        }

        featuresComponent.featureItems1 = [
            feature1,
            feature2a
        ]

        featuresComponent.featureItems2 = [
            feature2b,
            feature3
        ]

        fakeStorageItem = <StorageItem>{
            id : site.id,
            enabledFeatures : [{
                feature : feature1.feature,
                title : feature1.title
            }]
        };
    });

    describe('_saveFeatures()', () =>{
        it('should save featureItems1 to storage on cache miss', () =>{
            let storedItem : StorageItem;

            spyOn(storageService, 'getItem').and.returnValue(fakeStorageItem);
            spyOn(storageService, 'setItem').and.callFake((id : string, storageItem : StorageItem) =>{
                storedItem = storageItem;
            })
            spyOn(storageService, 'commit').and.callThrough();

            component._saveFeatures();

            expect(storedItem).toEqual(fakeStorageItem);
            expect(storedItem.id).toEqual(storedItem.id);
            expect(featuresEqual(storedItem.enabledFeatures, featuresComponent.featureItems1)).toBeTruthy();
            expect(storageService.commit).toHaveBeenCalledTimes(1);
        });

        it('should save featureItems2 to storage on cache hit', () =>{
            let storedItem : StorageItem;

            spyOn(storageService, 'getItem').and.returnValue(fakeStorageItem);
            spyOn(storageService, 'setItem').and.callFake((id : string, storageItem : StorageItem) =>{
                storedItem = storageItem;
            })
            spyOn(storageService, 'commit').and.callThrough();

            component._cacheHit = true;
            component._saveFeatures();

            expect(storedItem).toEqual(fakeStorageItem);
            expect(storedItem.id).toEqual(storedItem.id);
            expect(featuresEqual(storedItem.enabledFeatures, featuresComponent.featureItems2)).toBeTruthy();
            expect(storageService.commit).toHaveBeenCalledTimes(1);
        });

        it('should add a new storageItem if it does not exist', () =>{
            let storedItem : StorageItem;

            spyOn(storageService, 'getItem').and.returnValue(null);
            spyOn(storageService, 'setItem').and.callFake((id : string, storageItem : StorageItem) =>{
                storedItem = storageItem;
            })
            spyOn(storageService, 'commit').and.callThrough();

            component._saveFeatures();

            expect(storedItem).not.toBeNull();
            expect(storedItem.id).toEqual(storedItem.id);
            expect(featuresEqual(storedItem.enabledFeatures, featuresComponent.featureItems1)).toBeTruthy();
            expect(storageService.commit).toHaveBeenCalledTimes(1);
        });
    })

    describe('_mergeFeaturesIntoF1()', () =>{
        it('should not do anything on a cache miss', () =>{
            component._mergeFeaturesIntoF1(false, featuresComponent.featureItems1, featuresComponent.featureItems2);
            expect(featuresEqual(featuresComponent.featureItems1, featuresComponent.featureItems2)).toBeFalsy();
            expect(featuresEqual(featuresComponent.featureItems1, featuresComponent.featureItems2)).toBeFalsy();
        });

        it('should merge f2 into f1 and clean up f1', () =>{
            component._mergeFeaturesIntoF1(true, featuresComponent.featureItems1, featuresComponent.featureItems2);
            expect(featuresComponent.featureItems1.length).toEqual(2);
            expect(featuresComponent.featureItems2.length).toEqual(2);
            expect(featureEqual(featuresComponent.featureItems1[0], feature2a));
            expect(featureEqual(featuresComponent.featureItems1[1], feature3));
            expect(featuresEqual(featuresComponent.featureItems1, featuresComponent.featureItems2)).toBeTruthy();
        });

    })

    function featuresEqual(features1 : EnabledFeature[], features2 : EnabledFeature[]){
        if(features1 === features2){
            return true;
        }

        if(!features1 || !features2 || features1.length !== features2.length){
            return false;
        }

        for(let i = 0; i < features1.length; i++){
            if(!featureEqual(features1[i], features2[i])){
                return false;
            }
        }

        return true;
    }

    function featureEqual(feature1 : EnabledFeature, feature2 : EnabledFeature){
        return feature1.feature === feature2.feature
            && feature1.title === feature2.title;
    }
});