/// <reference path='../../typings/browser.d.ts' />
import {LocalStorageService as StorageService} from './local-storage.service';
import {Observable, Subscription as RxSubscription, Subject, ReplaySubject} from 'rxjs/Rx';
import {Storage, StorageItems, StorageItem} from '../models/localStorage/local-storage';

describe('Local Storage tests', () =>{
    let storageService : StorageService;
    let service : any;
    let testStorage : Storage;

    beforeEach(() =>{
        storageService = new StorageService();
        service = <any>storageService;
        localStorage.clear();

        testStorage = <Storage>{
            apiVersion : storageService.apiVersion,
            items : {
                'id1' : {
                    id : 'id1',
                    enabledFeatures : []
                }
            }
        }
    });

    describe('_loadStorage()', () =>{
        it('Should create a new empty storage object if none is found', () =>{
            spyOn(localStorage, "getItem").and.returnValue(null);
            spyOn(localStorage, 'removeItem').and.callThrough();

            service._loadStorage();

            let storage = <Storage>service._storage;
            expect(storage).not.toBeNull();
            expect(storage.apiVersion).toEqual(storageService.apiVersion);
            expect(storage.items).not.toBeNull();
            expect(Object.keys(storage.items).length).toEqual(0);
            expect((<any>localStorage.removeItem).calls.count()).toEqual(0);
        })

        it('Should erase cache on deserialization failure', () =>{
            spyOn(localStorage, "getItem").and.returnValue("bad data");
            spyOn(localStorage, 'removeItem').and.callThrough();
            service._loadStorage();

            let storage = <Storage>service._storage;
            expect(storage).not.toBeNull();
            expect(storage.apiVersion).toEqual(storageService.apiVersion);
            expect(storage.items).not.toBeNull();
            expect(Object.keys(storage.items).length).toEqual(0);
            expect((<any>localStorage.removeItem).calls.count()).toEqual(1);
        })

        it('Should erase cache on API version mismatch', () =>{
            spyOn(localStorage, "getItem").and.returnValue(JSON.stringify(testStorage));
            spyOn(localStorage, 'removeItem').and.callThrough();

            storageService.apiVersion = "2000-01-01";

            service._loadStorage();

            let storage = <Storage>service._storage;
            expect(storage).not.toBeNull();
            expect(storage.apiVersion).toEqual(storageService.apiVersion);
            expect(storage.items).not.toBeNull();
            expect(Object.keys(storage.items).length).toEqual(0);
            expect((<any>localStorage.removeItem).calls.count()).toEqual(1);
        })

        it('Should store cache if API versions match', () =>{
            spyOn(localStorage, "getItem").and.returnValue(JSON.stringify(testStorage));
            spyOn(localStorage, 'removeItem').and.callThrough();

            service._loadStorage();

            let storage = <Storage>service._storage;
            expect(storage).not.toBeNull();
            expect(storage.apiVersion).toEqual(storageService.apiVersion);
            expect(storage.items).not.toBeNull();
            expect(storage).toEqual(testStorage);
            expect((<any>localStorage.removeItem).calls.count()).toEqual(0);
        })
    })

    describe('commit()', () =>{
        it('Should commit to localStorage if there is max number of items', () =>{
            testStorage.items = getStorageItems(storageService.maxItems);

            service._storage = testStorage;
            storageService.commit();

            let savedStorage = JSON.parse(localStorage.getItem(storageService.storageEntryName));
            expect(savedStorage).toEqual(testStorage);
            expect(service._storage).toEqual(testStorage);
        });

        it('Should clear the cache if number of items exceeds max', () =>{
            testStorage.items = getStorageItems(storageService.maxItems + 1);

            service._storage = testStorage;
            storageService.commit();

            let savedStorage = localStorage.getItem(storageService.storageEntryName);
            expect(savedStorage).toBeNull();
            expect(service._storage).toBeNull();
        });

        it('Should clear the cache if localStorage exceeds its quota', () =>{
            spyOn(localStorage, 'setItem').and.throwError("Exceeded quota");
            testStorage.items = getStorageItems(1);

            service._storage = testStorage;
            storageService.commit();

            let savedStorage = localStorage.getItem(storageService.storageEntryName);
            expect(savedStorage).toBeNull();
            expect(service._storage).toBeNull();
        });
    });

    function getStorageItems(numItems : number) : StorageItems{
        let items : StorageItems = {};
        for(let i = 0; i < numItems; i++){
            let item : StorageItem = {
                id : `/subscriptions/6d3cd008-476f-4365-9e65-b647c07ec7af/resourceGroups/someResourceGroup/providers/Microsoft.Web/sites/foo${i}`,
                enabledFeatures : [        {
                    "title": "Deployment Source configured with GitHub",
                    "feature": 0
                },
                {
                    "title": "Web Jobs",
                    "feature": 1
                }]
            }

            items[item.id] = item;
        }

        return items;
    }
});