import {Injectable} from '@angular/core';
import {FunctionContainer} from '../models/function-container';
import {UserService} from './user.service';

@Injectable()
export class GlobalStateService {
    private _functionContainer: FunctionContainer;

    constructor(private _userService: UserService) {
        this._userService.getFunctionContainer().subscribe(fc => this._functionContainer = fc);
    }

    get FunctionContainer(): FunctionContainer {
        return this._functionContainer;
    }
}