import Ajv from 'ajv';
import _ from 'underscore';

import changeSchema from '../schemas/change_schema.json';
import controlSchema from '../schemas/control_schema.json';
import addEntrySchema from '../schemas/add_entry_schema.json';
import updateAttrSchema from '../schemas/update_attr_schema.json';
import ValidationError from '../errors/validation_error';
import errorList from '../../test/error_list.json';

const ajv:any = new Ajv();

/**
 * @module checkVariableFormat
 * @class CheckParam
 */
export default class CheckParam {

  /**
    * Checks if the arguments provided are Strings.
    *
    * @method validateStrings
    * @return Throws an error in case the provided parameters aren't  valid
   * strings
    */

  static validateStrings(): void{
    _.each(arguments, element => {
      if (!_.isString(element)) {
        throw new TypeError((<any>errorList).typeErrorMessage);
      }
    });
  }

  /**
    * Verify the modify change parameter.
    *
    * @method checkModifyChange
    * @param {Object || Array} changes parameter set for verification
    * @return Throws error in case the changes is not valid. Return the changes as
    * an array in case entry is valid
    */
  static checkModifyChange(changes:any): object[] {
    const changesAttr = !_.isArray(changes) ? [changes] : changes;
    const changeBuildArr:Array<object> = [];
    changesAttr.forEach(element => {
      const valid = ajv.validate(changeSchema, element);
      if (!valid) {
        throw new ValidationError(
          (<any>errorList).invalidJSONMessage, undefined, ajv.errors);
      }
      if (element.op === 'update') {
        const deleteVals:Array<string> = [];
        const addVals:Array<string> = [];

        <any>element.vals.forEach((val:any) => {
          const validVal = ajv.validate(updateAttrSchema, val);
          if (!validVal) {
            throw new ValidationError(
              (<any>errorList).invalidJSONMessage, undefined, ajv.errors);
          } else {
            deleteVals.push(val.oldVal);
            addVals.push(val.newVal);
          }
        });

        const ldapDeleteObject = {
          op: 'delete',
          attr: element.attr,
          vals: deleteVals,
        };
        changeBuildArr.push(ldapDeleteObject);
        const ldapAddObject = {
          op: 'add',
          attr: element.attr,
          vals: addVals,
        };
        changeBuildArr.push(ldapAddObject);
      } else {
        changeBuildArr.push(element);
      }
    });
    return changeBuildArr;
  }

  /**
    * Verify the control parameter.
    *
    * @method checkControl
    * @param {Object || Array} controls parameter set for verification
    * @return Throws error in case the controls is not valid with the schema
    * members. Return the array of control or null if the control is undefined.
    */
  static checkControl(controls:Object | Array<Object>): Array<Object> | null {
    if (controls !== undefined) {
      const ctrls = !_.isArray(controls) ? [controls] : controls;
      ctrls.forEach(element => {
        const valid = ajv.validate(controlSchema, element);
        if (!valid) {
          throw new ValidationError(
            (<any>errorList).controlPropError, undefined, ajv.errors);
        }
      });
      return ctrls;
    }
    return null;
  }

  /**
    * Verify the entry parameter.
    *
    * @method checkControlArray
    * @param {Object || Array} entry parameter set for verification
    * @return Throws error in case the entry is not valid. Return the entry as
    * an array in case entry is valid
    */
  static checkEntryObject(entry:Object | Array<Object>): Array<Object> {
    const entryAttr = !_.isArray(entry) ? [entry] : entry;

    entryAttr.forEach(element => {
      const valid = ajv.validate(addEntrySchema, element);
      if (!valid) {
        throw new ValidationError(
          (<any>errorList).entryObjectError, undefined, ajv.errors);
      }
    });
    return entryAttr;
  }

}