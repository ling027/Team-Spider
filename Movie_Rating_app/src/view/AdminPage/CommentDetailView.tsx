import React, { useState } from 'react';
import { adminAPI } from '../../api/admin';
import type { AdminComment, AdminCommentReply } from '../../api/admin';
import ConfirmDialog from '../../components/ConfirmDialog';
import Alert from '../../components/Alert';
import NavBar from '../Component/Navbar';
import { FaStar } from 'react-icons/fa';
import './admin.css';

interface CommentDetailViewProps {
  comment: AdminComment;
  onBack: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
}

const CommentDetailView: React.FC<CommentDetailViewProps> = ({ 
  comment, 
  onBack, 
  onDelete, 
  onRestore 
}) => {
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'delete' | 'restore' | 'default';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'default',
    onConfirm: () => {}
  });
  const [alert, setAlert] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const handleDelete = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this review?',
      type: 'delete',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          await adminAPI.deleteComment(comment.id);
          setAlert({
            isOpen: true,
            message: 'Review deleted successfully',
            type: 'success'
          });
          if (onDelete) onDelete();
          setTimeout(() => onBack(), 1000);
        } catch (err: any) {
          setAlert({
            isOpen: true,
            message: err.message || 'Failed to delete review',
            type: 'error'
          });
        }
      }
    });
  };

  const handleRestore = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Restore',
      message: 'Are you sure you want to restore this review?',
      type: 'restore',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          await adminAPI.restoreComment(comment.id);
          setAlert({
            isOpen: true,
            message: 'Review restored successfully',
            type: 'success'
          });
          if (onRestore) onRestore();
          setTimeout(() => onBack(), 1000);
        } catch (err: any) {
          setAlert({
            isOpen: true,
            message: err.message || 'Failed to restore review',
            type: 'error'
          });
        }
      }
    });
  };

  const handleDeleteReply = (replyId: string, replyAuthor: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Delete',
      message: `Are you sure you want to delete the reply by ${replyAuthor}?`,
      type: 'delete',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          await adminAPI.deleteCommentReply(comment.id, replyId);
          setAlert({
            isOpen: true,
            message: 'Reply deleted successfully',
            type: 'success'
          });
          if (onDelete) onDelete();
        } catch (err: any) {
          setAlert({
            isOpen: true,
            message: err.message || 'Failed to delete reply',
            type: 'error'
          });
        }
      }
    });
  };

  return (
    <>
      <NavBar />
      <div className="admin-detail-view">
        <div className="admin-detail-header">
          <button onClick={onBack} className="admin-back-button">← Back to Dashboard</button>
          <h2>Review Details</h2>
        </div>

        <div className="admin-detail-content">
          <div className="admin-detail-section">
            <h3>Review Information</h3>
            <div className="admin-detail-info">
              <div className="info-row">
                <strong>Review ID:</strong> <span>{comment.id}</span>
              </div>
              <div className="info-row">
                <strong>User:</strong> <span>{comment.username}</span>
              </div>
              <div className="info-row">
                <strong>Email:</strong> <span>{comment.email}</span>
              </div>
              <div className="info-row">
                <strong>Movie ID:</strong> <span>{comment.movieTmdbId}</span>
              </div>
              {comment.rating && (
                <div className="info-row">
                  <strong>Rating:</strong> <span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        className={star <= comment.rating! ? 'filled' : 'empty'}
                        style={{ color: star <= comment.rating! ? '#ffdd59' : '#ccc', marginRight: '2px' }}
                      />
                    ))}
                    <span style={{ marginLeft: '8px' }}>{comment.rating}/5</span>
                  </span>
                </div>
              )}
              <div className="info-row">
                <strong>Status:</strong> <span className={comment.isDeleted ? 'deleted-status' : 'active-status'}>
                  {comment.isDeleted ? 'Deleted' : 'Active'}
                </span>
              </div>
              <div className="info-row">
                <strong>Created:</strong> <span>{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              {comment.deletedAt && (
                <div className="info-row">
                  <strong>Deleted At:</strong> <span>{new Date(comment.deletedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="admin-detail-section">
            <h3>Review Content</h3>
            <div className="admin-discussion-content">
              <p style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{comment.text}</p>
            </div>
          </div>

          {comment.replies && comment.replies.length > 0 && (
            <div className="admin-detail-section">
              <h3>Replies ({comment.replies.length})</h3>
              <div className="admin-replies-list">
                {comment.replies.map((reply: AdminCommentReply) => (
                  <div key={reply.id} className="admin-reply-item">
                    <div className="admin-reply-header">
                      <div>
                        <strong>{reply.author}</strong>
                        <span className="admin-reply-timestamp">
                          {new Date(reply.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteReply(reply.id, reply.author)}
                        className="admin-delete-reply-button"
                        title="Delete reply"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="admin-reply-content">
                      <p style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', margin: 0 }}>
                        {reply.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="admin-detail-actions">
            {comment.isDeleted ? (
              <button onClick={handleRestore} className="admin-action-button restore">
                Restore Review
              </button>
            ) : (
              <button onClick={handleDelete} className="admin-action-button delete">
                Delete Review
              </button>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.type === 'delete' ? 'Delete' : 'Restore'}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
      <Alert
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, isOpen: false })}
      />
    </>
  );
};

export default CommentDetailView;

