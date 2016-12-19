import {Component, OnInit, EventEmitter, Input, Output} from '@angular/core';
import {Observable, Subject, Subscription as RxSubscription} from 'rxjs/Rx';
import {CacheService} from '../../../services/cache.service';
import {RBACService} from '../../../services/rbac.service';
import {SiteDescriptor} from '../../../common/resourceDescriptors';
import {PublishingCredentials} from '../../../models/publishing-credentials';
import {SiteConfig} from '../../../models/arm/site-config';
import {SiteEnabledFeaturesComponent} from '../enabledFeatures/site-enabled-features.component';
import {SiteNotificationsComponent} from '../notifications/site-notifications.component';
import {Site} from '../../../models/arm/site';
import {ArmObj} from '../../../models/arm/arm-obj';

@Component({
    selector: 'site-summary',
    templateUrl: 'app/components/site/summary/site-summary.component.html',
    inputs: ['siteInput'],
    directives: [SiteEnabledFeaturesComponent, SiteNotificationsComponent],
})

export class SiteSummaryComponent {

    public subscription : string;
    public resourceGroup : string;
    public location : string;
    public state : string;
    public plan : string;
    public url : string;
    public publishingUserName : string;
    public scmType : string;
    public site : ArmObj<Site>;
    public hasWriteAccess : boolean;

    @Output() openTabEvent = new Subject<string>();

    private _siteSubject : Subject<ArmObj<Site>>;

    constructor(cacheService : CacheService, rbacService : RBACService) {
        this._siteSubject = new Subject<ArmObj<Site>>();
        this._siteSubject
            .distinctUntilChanged()
            .switchMap(site =>{
                this.site = site;
                let descriptor = new SiteDescriptor(site.id);

                this.subscription = descriptor.subscription;
                this.resourceGroup = descriptor.resourceGroup;

                let serverFarm = site.properties.serverFarmId.split('/')[8];
                this.plan = `${serverFarm} (${site.properties.sku})`;
                this.url = `http://${site.properties.hostNames[0]}`;

                this.location = site.location;
                this.state = site.properties.state;

                this.publishingUserName = "Loading...";
                this.scmType = null;

                let configId = `${site.id}/config/web`;

                return Observable.zip(
                    rbacService.hasPermission(site.id, [rbacService.writeScope]),
                    cacheService.getArmResource(configId),
                    (hasPermission, config) =>({ hasPermission : hasPermission, config : config}))
            })
            .flatMap(res =>{
                if(res.hasPermission){
                    let credId = `${this.site.id}/config/publishingcredentials/list`;
                    return cacheService.postArmResource(credId)
                        .map(creds =>{
                            return {
                                creds : creds,
                                config : res.config,
                                hasPermission : res.hasPermission
                            }
                        })
                }

                return Observable.of(res);
            })
            .subscribe((res : {creds : PublishingCredentials, config : ArmObj<SiteConfig>, hasPermission : boolean}) =>{
                this.hasWriteAccess = res.hasPermission;

                if(res.hasPermission){
                    this.publishingUserName = res.creds.properties.publishingUserName;
                }
                else{
                    this.publishingUserName = "No access";
                }

                this.scmType = res.config.properties.scmType;
            });
    }

    set siteInput(site : ArmObj<Site>){
        if(!site){
            return;
        }

        this._siteSubject.next(site);
    }

    openComponent(component : string){
        this.openTabEvent.next(component);
    }
}