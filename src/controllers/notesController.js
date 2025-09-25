// src/controllers/notesController.js

import { Note } from '../models/note.js';
import createHttpError from 'http-errors';

// get all notes
export const getNotes = async (req, res) => {
  // Get parameters from pagination
  const { page = 1, perPage = 10, tag, search } = req.query;

  const skip = (page - 1) * perPage;

  // Create a base query to collection
  const notesQuery = Note.find({ userId: req.user._id });

  // If tag is provided, add it to the query
  if (tag) {
    notesQuery.where('tag').equals(tag);
  }
  // If search is provided, add it to the query
  if (search) {
    const searchRegex = new RegExp(search, 'i'); // 'i' for case-insensitive
    notesQuery.or([{ title: searchRegex }, { content: searchRegex }]);
  }

  const [totalNotes, notes] = await Promise.all([
    notesQuery.clone().countDocuments(), // Get total count of documents
    notesQuery.skip(skip).limit(perPage), // Get paginated results
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(totalNotes / perPage);

  res.status(200).json({
    page,
    perPage,
    totalPages,
    totalNotes,
    notes,
  });
};

// get notes by id
export const getNoteById = async (req, res, next) => {
  const { noteId } = req.params;
  const note = await Note.findOne({ _id: noteId, userId: req.user._id });

  if (!note) {
    next(createHttpError(404, 'Note not found'));
    return;
  }

  res.status(200).json(note);
};

// create a new note
export const createNote = async (req, res) => {
  const note = await Note.create({ ...req.body, userId: req.user._id });
  res.status(201).json(note);
};

// delete a note
export const deleteNote = async (req, res, next) => {
  const { noteId } = req.params;
  const note = await Note.findOneAndDelete({
    _id: noteId,
    userId: req.user._id,
  });

  if (!note) {
    next(createHttpError(404, 'Note not found'));
    return;
  }

  res.status(200).send(note);
};

// update a notes
export const updateNote = async (req, res, next) => {
  const { noteId } = req.params;

  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId: req.user._id }, // Search filter Id
    req.body,
    { new: true }, // Return the updated document
  );

  if (!note) {
    next(createHttpError(404, 'Note not found'));
    return;
  }

  res.status(200).json(note);
};
