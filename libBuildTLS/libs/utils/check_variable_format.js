'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const Ajv = require("ajv");
const _ = require("underscore");
const changeSchema = require("../schemas/change_schema.json");
const controlSchema = require("../schemas/control_schema.json");
const addEntrySchema = require("../schemas/add_entry_schema.json");
const updateAttrSchema = require("../schemas/update_attr_schema.json");
const ValidationError = require("../errors/validation_error");
const errorList = require("../../test/error_list.json");
const ajv = new Ajv();
/**
 * @module checkVariableFormat
 * @class CheckParam
 */
class CheckParam {
    /**
      * Checks if the arguments provided are Strings.
      *
      * @method validateStrings
      * @return Throws an error in case the provided parameters aren't  valid
     * strings
      */
    static validateStrings() {
        _.each(arguments, (element) => {
            if (!_.isString(element)) {
                throw new TypeError(errorList.typeErrorMessage);
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
    static checkModifyChange(changes) {
        const changesAttr = !_.isArray(changes) ? [changes] : changes;
        const changeBuildArr = [];
        changesAttr.forEach((element) => {
            const valid = ajv.validate(changeSchema, element);
            if (!valid) {
                throw new ValidationError(errorList.invalidJSONMessage, undefined, ajv.errors);
            }
            if (element.op === 'update') {
                const deleteVals = [];
                const addVals = [];
                element.vals.forEach((val) => {
                    const validVal = ajv.validate(updateAttrSchema, val);
                    if (!validVal) {
                        throw new ValidationError(errorList.invalidJSONMessage, undefined, ajv.errors);
                    }
                    else {
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
            }
            else {
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
    static checkControl(controls) {
        if (controls !== undefined) {
            const ctrls = !_.isArray(controls) ? [controls] : controls;
            ctrls.forEach((element) => {
                const valid = ajv.validate(controlSchema, element);
                if (!valid) {
                    throw new ValidationError(errorList.controlPropError, undefined, ajv.errors);
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
    static checkEntryObject(entry) {
        const entryAttr = !_.isArray(entry) ? [entry] : entry;
        entryAttr.forEach((element) => {
            const valid = ajv.validate(addEntrySchema, element);
            if (!valid) {
                throw new ValidationError(errorList.entryObjectError, undefined, ajv.errors);
            }
        });
        return entryAttr;
    }
}
module.exports = CheckParam;
