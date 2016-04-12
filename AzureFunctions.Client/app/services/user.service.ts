import {Http, Headers} from 'angular2/http';
import {Injectable} from 'angular2/core';
import {Observable} from 'rxjs/Rx';
import {User} from '../models/user';
import {TenantInfo} from '../models/tenant-info';
import {PortalService} from './portal.service';
import {ArmService} from './arm.service';
import {SourceControlState} from '../models/source-control-state';

@Injectable()
export class UserService {
    public inIFrame: boolean;
    private currentToken: string;
    constructor(
        private _http: Http,
        private _portalService: PortalService,
        private _armService: ArmService) {
        this.inIFrame = window.parent !== window;
        this.getToken().subscribe(t => this.currentToken = t);
    }

    getTenants() {
        return this._http.get('api/tenants')
            .catch(e => Observable.of({ json: () => [] }))
            .map<TenantInfo[]>(r => r.json());
    }

    getUser() {
        return this._http.get('api/token')
            .map<User>(r => r.json());
    }

    getCurrentToken() {
        return this.currentToken;
    }

    getToken() {
        if (this.inIFrame) {
            return this._portalService.getToken();
        } else {
            return this._http.get('api/token?plaintext=true').map<string>(r => r.text());
        }
    }

    getSourceControlState() {
        return this._armService.getConfig()
        .map
    }
}