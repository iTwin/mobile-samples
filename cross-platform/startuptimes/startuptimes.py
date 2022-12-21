#!/usr/bin/env python3

#---------------------------------------------------------------------------------------------
# Copyright (c) Bentley Systems, Incorporated. All rights reserved.
# See LICENSE.md in the project root for license terms and full copyright notice.
#---------------------------------------------------------------------------------------------

'''
Application to maintain a database of startup times for the iTwin Mobile SDK
samples.
'''

import argparse
import sqlite3
import json
import sys
import textwrap
from typing import Any, Callable, Sequence, TextIO, Union
from io import TextIOWrapper
from functools import partial

Record = dict[str, Any]
Records = Sequence[Record]
Test = Union[tuple[str, str], str]
ColumnDef = Union[str, tuple[str, str]]
ColumnDefs = Sequence[ColumnDef]
Formatters = Sequence[Callable[[Any], str] | None]
SQLiteDescription = tuple[tuple[str, None, None, None, None, None, None], ...] | Any

class ASCIITable:
    '''
    Object for generating an ASCII table.
    '''

    __data: Records
    __column_defs: ColumnDefs
    __formatters: Formatters | None
    __max_lengths: list[int]

    def __init__(
        self,
        data: Records,
        column_defs: ColumnDefs,
        formatters: Formatters | None = None
    ) -> None:
        '''
        Creates an ASCII table containing data, which is a sequence of dict values.

        Each value in `columns` must be either a `str` value or a tuple of two
        `str` values. If it is a `str`, the value is used as a key. If it is a
        tuple, the first element of the tuple is used as a key. Either way, the key
        is used to look up values in each `Record` in `data`. If the value in
        `columns` is a tuple, then the second element of the tuple is used as the
        column title. Otherwise, the key is used as the column title.
        '''

        self.__data = data
        self.__column_defs = column_defs
        self.__formatters = formatters

    @staticmethod
    def __value_string(value: Any) -> str:
        '''
        Converts `value` into a string and returns it.

        For all types except float, this simply creates a string. For float
        values, this creates a string with 3 decimal places.
        '''

        if isinstance(value, str):
            return value
        if isinstance(value, float):
            return f'{value:.3f}'
        return str(value)

    @staticmethod
    def elapsed_string(value):
        '''
        Converts `value` into a string with an 's' suffix and returns it.

        Uses `value_string()` to convert the value into a string, then adds the 's'
        suffix.
        '''

        return f'{ASCIITable.__value_string(value)}s'

    def __format_value(self, pad, value, max_length, formatter = None) -> str:
        if formatter is not None:
            short_string = formatter(value)
        else:
            short_string = ASCIITable.__value_string(value)
        if isinstance(value, (int, float)):
            just = short_string.rjust
        else:
            just = short_string.ljust
        return just(max_length, pad)

    def __format_row(
        self,
        row: list,
        use_formatters = False,
        separator = ' | ',
        pad = ' ') -> str:
        '''
        Formats the values in row and produces a string where each column in row
        has a length determined by the corresponding entry in max_lengths, with
        separator used to separate columns, and pad used to pad the columns to
        correct length.

        Returns a string representation of row, with a line feed on the end.
        '''

        map_args = [ partial(self.__format_value, pad), row, self.__max_lengths ]
        if use_formatters and self.__formatters is not None:
            map_args.append(self.__formatters)
        return separator.join(map(*map_args)) + '\n'

    def __str__(self) -> str:
        '''
        Creates an ASCII table based on parameters to the constuctor.
        '''

        if len(self.__data) == 0 or len(self.__column_defs) == 0:
            return ''

        for i, column_def in enumerate(self.__column_defs):
            if not isinstance(column_def, tuple):
                self.__column_defs[i] = (column_def, column_def)
        header_row = [column_def[1] for column_def in self.__column_defs]
        self.__max_lengths = list(map(len, header_row))
        line_row = len(self.__column_defs) * ['']
        data_values = []
        for row in self.__data:
            row_values = []
            for (key, _) in self.__column_defs:
                row_values.append(row[key])
            data_values.append(row_values)
            for i, length in enumerate(self.__max_lengths):
                self.__max_lengths[i] = max(length, len(ASCIITable.__value_string(row_values[i])))
        result = ''
        result = result + self.__format_row(header_row)
        result = result + self.__format_row(line_row, False, '-+-', '-')
        for row_values in data_values:
            result = result + self.__format_row(row_values, self.__formatters is not None)
        return result

class StartupTimesDB:
    '''
    Object for dealing with the StartupTimes sqlite3 database.
    '''

    __db: sqlite3.Connection

    def __init__(self, filename: str) -> None:
        '''
        Constructs a StartupTimesDB object and connects to the sqlite3 database referenced by
        `filename`. If such a database does not exist, it is created.
        '''

        self.__connect(filename)

    def __create_tables(self) -> None:
        '''
        Create the tables and indices in `db` needed by startuptimes (other
        than Props).
        '''

        cur = self.cursor()
        sql = '''
            CREATE TABLE Device(
                id INTEGER PRIMARY KEY,
                cpuCores INTEGER NOT NULL,
                memory INTEGER NOT NULL,
                model TEXT,
                modelID TEXT NOT NULL,
                modelIDRefURL TEXT NOT NULL,
                systemName TEXT NOT NULL,
                systemVersion TEXT NOT NULL
            );
            CREATE TABLE Entry(
                id INTEGER PRIMARY KEY,
                iTwinVersion TEXT NOT NULL,
                title TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                totalTime REAL NOT NULL,
                usingRemoteServer INT NOT NULL,
                deviceID INT NOT NULL,
                FOREIGN KEY(deviceID) REFERENCES Device(id)
            );
            CREATE TABLE Checkpoint(
                id INTEGER PRIMARY KEY,
                entryID INTEGER NOT NULL,
                arrayIndex INT NOT NULL,
                action TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                step REAL NOT NULL,
                total REAL NOT NULL,
                FOREIGN KEY(entryID) REFERENCES Entry(id)
            );
            CREATE INDEX Entry_timestamp on Entry(timestamp);
            CREATE INDEX Checkpoint_arrayIndex on Checkpoint(arrayIndex);
            CREATE INDEX Device_modelID on Device(modelID);
        '''
        cur.executescript(sql)

    def __check_for_table(self, table_name: str) -> bool:
        '''
        Check to see if a table named `table_name` exists in `db`.

        Returns True if the table extists, or False otherwise.
        '''

        cur = self.cursor()
        sql = '''
            SELECT EXISTS(SELECT 1 FROM sqlite_schema WHERE type="table" AND name=?);
        '''
        cur.execute(sql, [ table_name ])
        return cur.fetchone()[0] == 1

    def __setup(self) -> None:
        '''
        Set up `db` for use with `startuptimes`. If `db` is not already set up,
        this will also create and populate the Props table.
        '''

        cur = self.cursor()
        # NOTE: foreign_keys must be turned on ever time the connection is opened.
        cur.execute('PRAGMA foreign_keys = ON')
        # id is included in the records below to allow for easy checking that the values in the
        # database match the expected values. If schemaVersion ever gets bumped, the logic will
        # have to get more complicated.
        version_record = {
            'id': 1,
            'namespace': 'startuptimes',
            'name': 'schemaVersion',
            'value': '1.0'
        }
        if self.__check_for_table('Props'):
            sql = '''
                SELECT * FROM Props WHERE namespace == 'startuptimes' AND name == 'schemaVersion'
            '''
            cur.execute(sql)
            rows = self.process_rows(cur.fetchall(), cur.description)
            if len(rows) == 1 and rows[0] ==  version_record:
                # The database schema is already correct, so we are done.
                return
        else:
            # Props table does not yet exist. Create and initialize it.
            sql = '''
                CREATE TABLE Props(
                    id INTEGER PRIMARY KEY,
                    namespace TEXT NOT NULL,
                    name TEXT NOT NULL,
                    value TEXT NOT NULL
                );
                CREATE UNIQUE INDEX Props_namespace ON Props(namespace);
                CREATE UNIQUE INDEX Props_lookup ON Props(namespace, name);
            '''
            cur.executescript(sql)
            self.insert_record('Props', version_record)
        self.__create_tables()

    def __connect(self, filename: str) -> None:
        '''
        Connects to the SQLite database contained in the file named `filename`.

        Also insures that the database is configured for use by startuptimes.

        Returns the database connection.
        '''

        self.__db = sqlite3.connect(filename)
        self.__setup()

    def get_column_names(self, record: Record) -> list[str]:
        '''
        Gets the column names of the primitive fields `record`. (Primitive fields
        are of type `str`, `int`, `bool`, and `float`.)

        Returns a list containing the column names.
        '''

        column_names = []
        for key in record:
            value = record[key]
            # NOTE: bool is a subclass of int.
            if isinstance(value, (str, int, float)):
                column_names.append(key)
        return column_names

    def create_insert_sql(self, table_name: str, record: Record) -> str:
        '''
        Creates a SQL statement suitable for inserting `record` into a table
        named `table_name`.

        Returns the SQL statement.
        '''

        column_names = self.get_column_names(record)
        sql = 'INSERT INTO ' + table_name + '('
        sql += ', '.join(column_names)
        sql += ') VALUES ('
        sql += ', '.join(map(lambda column_name: f':{column_name}', column_names))
        sql += ');'
        # sql should now be of the following form:
        # INSERT INTO TableName(column1, column2, ...) VALUES (:column1, :column2, ...);
        return sql

    def insert_record(self, table_name: str, record: Record) -> int:
        '''
        Inserts `record` into the table named `table_name` in `db`.

        Returns the id of the inserted record.
        '''

        sql = self.create_insert_sql(table_name, record)
        cur = self.cursor()
        cur.execute(sql, record)
        self.commit()
        return cur.lastrowid or 0

    def insert_records(self, table_name: str, records: list[Record]) -> None:
        '''
        Inserts `records` into the table named `table_name` in `db`.
        '''

        if len(records) == 0:
            return
        sql = self.create_insert_sql(table_name, records[0])
        cur = self.cursor()
        cur.executemany(sql, records)
        self.commit()

    def find_device_id(self, device: Record) -> int:
        '''
        Looks for `device` in `db` and returns its id if it is found. Otherwise,
        adds `device` to `db` and returns the id of the newly created record.

        Returns the id of the matching device entry.
        '''

        cur = self.cursor()
        sql = '''
            SELECT id FROM Device
                WHERE cpuCores = :cpuCores
                AND memory = :memory
                AND modelID = :modelID
                AND systemVersion = :systemVersion
        '''
        cur.execute(sql, device)
        row = cur.fetchone()
        if row is not None:
            return int(row[0])
        device_id = self.insert_record('Device', device)
        model_id = device['modelID']
        print(f'Device {model_id} inserted with ID: {device_id}')
        return device_id

    def insert_entry(self, entry: Record) -> None:
        '''
        Inserts `entry` into `db`. This creates records in the Entry,
        Checkpoints, and (optionally) Device tables. (If a record already exists
        in the Device table matching the device of `entry`, that device is
        used.)
        '''

        device_id = self.find_device_id(entry['device'])
        entry['deviceID'] = device_id
        cur = self.cursor()
        cur.execute('SELECT 1 FROM Entry WHERE timestamp=:timestamp AND deviceID=:deviceID', entry)
        if cur.fetchone() is not None:
            model_id = entry['device']['modelID']
            timestamp = entry['timestamp']
            print(f'Entry for {model_id} at {timestamp} is already present! Skipping.')
            return
        entry_id = self.insert_record('Entry', entry)
        print(f'Entry inserted with ID: {entry_id}')
        index = 0
        checkpoints = entry['checkpoints']
        for checkpoint in checkpoints:
            checkpoint['entryID'] = entry_id
            checkpoint['arrayIndex'] = index
            index = index + 1
        self.insert_records('Checkpoint', checkpoints)
        print(f'{len(checkpoints)} checkpoints inserted.')

    def add_from_json(self, json_string: str) -> None:
        '''
        Add an entry to db from the given JSON string.
        '''

        data = json.loads(json_string)
        if isinstance(data, list):
            for entry in data:
                self.insert_entry(entry)
        else:
            self.insert_entry(data)

    def cursor(self) -> sqlite3.Cursor:
        '''
        Get a cursor from the database.
        '''
        return self.__db.cursor()

    def commit(self) -> None:
        '''
        Commit outstanding changes to the database.
        '''
        self.__db.commit()

    def close(self) -> None:
        '''
        Close the database connection.
        '''
        self.__db.close()

    def process_row(self, row: tuple, description: SQLiteDescription) -> Record:
        '''
        Process the raw tuple `row` returned by a sqlite3 Cursor and converts it
        into a dict using `description` (which comes from the Cursor).

        Returns the dictionary representation of the `row` tuple.
        '''

        return dict(zip([value[0] for value in description], row))

    def process_rows(self, rows: list, description: SQLiteDescription) -> list[Record]:
        '''
        Process the raw tuples `rows` returned by a sqlite3 Cursor and converts
        them into a list of dicts using `description` (which comes from the
        Cursor).

        Returns a list containing the dictionary representations of the row
        tuples.
        '''

        result = []
        for row in rows:
            result.append(self.process_row(row, description))
        return result

def gen_report_row(db: sqlite3.Connection, where: Record) -> Record:
    '''
    Generates a report row from data in `db` using the values in `where`.

    The `where` parameter must contatin 'deviceID' and 'iTwinVersion'
    values.

    Returns a dict with data for one row in a report.
    '''

    cur = db.cursor()
    cur.execute('SELECT * FROM Device WHERE id = :deviceID', where)
    device = db.process_row(cur.fetchone(), cur.description)
    sql = 'SELECT * FROM Entry WHERE iTwinVersion = :iTwinVersion AND deviceID = :deviceID'
    cur.execute(sql, where)
    entries = db.process_rows(cur.fetchall(), cur.description)
    total_time = 0.0
    for entry in entries:
        total_time += entry['totalTime']
    return {
        'modelID': device['modelID'],
        'iTwinVersion': where['iTwinVersion'],
        'averageTime': total_time / len(entries),
        'samples': len(entries)
    }

def add_command(db: StartupTimesDB, args) -> None:
    '''
    Handler for the 'add' command line command. (See command help for more
    info.)
    '''

    input_file: TextIO
    if hasattr(args, 'filename') and args.filename:
        input_file = open(args.filename, encoding='utf-8')
    else:
        input_file = sys.stdin
        print('Input entry JSON, then hit Ctrl+D:')
    lines = input_file.readlines()
    json_string = ''
    for line in lines:
        stripped = line.rstrip()
        if len(stripped) > 0:
            json_string += f'{stripped}\n'
        else:
            db.add_from_json(json_string)
            json_string = ''
    if len(json_string) != 0:
        db.add_from_json(json_string)
    if isinstance(input_file, TextIOWrapper):
        input_file.close()

def report_command(db: StartupTimesDB, _) -> None:
    '''
    Handler for the 'report' command line command. (See command help for
    more info.)
    '''

    cur = db.cursor()
    report_rows = []
    sql = '''
        SELECT DISTINCT iTwinVersion, deviceID, modelID FROM Entry, Device
            WHERE Entry.deviceID = Device.id ORDER BY modelID
    '''
    for row in cur.execute(sql):
        report_rows.append(gen_report_row(db, { 'iTwinVersion': row[0], 'deviceID': row[1] }))
    columns = [
        ('modelID', 'Device'),
        'iTwinVersion',
        ('averageTime', 'Average Time'),
        ('samples', 'Samples')
    ]
    table = ASCIITable(report_rows, columns, [ None, None, ASCIITable.elapsed_string , None ])
    print(f'Results:\n{table}')

def main() -> None:
    '''
    The startuptimes main program.
    '''

    parser = argparse.ArgumentParser(
        description='Script for interacting with iTwin Mobile SDK samples startup times database.',
        epilog=textwrap.dedent('''
            When run with no arguments, runs the report command.
            '''))
    parser.add_argument(
        '-d',
        '--db_filename',
        dest='db_filename',
        help='Filename of the SQLite database to use for entries. Default is ./StartupTimes.db.',
        required=False)
    sub_parsers=parser.add_subparsers(title='Commands', metavar='')

    parser_add = sub_parsers.add_parser(
        'add',
        help='Add one or more entries from a file or from stdin.',
        description=textwrap.dedent('''
            If a filename is specified, that filename is parsed as JSON. If no
            filename is specified, the user is prompted to enter JSON. The record
            or records in the JSON are inserted into the database.

            Either way, blank lines in the input are treated as separators between
            distinct JSON values that will be parsed separately. So, to add multiple
            entries, you can either put them into a JSON array, or simply put them
            sequentially with blank lines between them.
            '''),
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser_add.set_defaults(func=add_command)
    parser_add.add_argument(
        '-f',
        '--filename',
        dest='filename',
        help='Filename containing JSON for entry or entries',
        required=False)

    parser_report = sub_parsers.add_parser(
        'report',
        help='Print report using data in database.',
        description=textwrap.dedent('''
            Prints a report in ASCII table format based on the data in the database.
            '''),
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser_report.set_defaults(func=report_command)

    args = parser.parse_args()
    # For some reason, getattr returns None when db_filename doesn't exist, instead of returning
    # the default value of 'StartupTimes.db'. However, getattr without a provided default is
    # documented to throw an exception if the given attribute does not exist. Since I don't know
    # why it doesn't throw an exception without the default argument, I am providing it just in
    # case. And the 'or 'StartupTimes.db'' on the end is there because getattr is returning None.
    db = StartupTimesDB(getattr(args, 'db_filename', 'StartupTimes.db') or 'StartupTimes.db')
    try:
        if hasattr(args, 'func'):
            args.func(db, args)
        else:
            report_command(db, args)
    finally:
        db.close()

if __name__ == '__main__':
    main()
