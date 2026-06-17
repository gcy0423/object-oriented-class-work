export function createCollaborationSeed(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    rooms: [
      {
        id: "room_ood",
        title: "Object-Oriented Course Workspace",
        courseId: "course_ood",
        ownerId: "user_teacher",
        type: "course",
        description: "Course-level collaboration area for requirement analysis, domain modeling, implementation planning, and final report alignment.",
        visibility: "course",
        status: "active",
        pinned: true,
        tags: ["course", "design", "integration"],
        createdAt: yesterday,
        updatedAt: today
      },
      {
        id: "room_assignment_design",
        title: "Assignment Design Discussion",
        courseId: "course_ood",
        assignmentId: "assign_ood_01",
        ownerId: "user_teacher",
        type: "assignment",
        description: "Discussion room for rubric scope, grading details, deliverable checklist, and submission risk control.",
        visibility: "course",
        status: "active",
        pinned: false,
        tags: ["assignment", "rubric", "assessment"],
        createdAt: yesterday,
        updatedAt: today
      },
      {
        id: "room_team_backend",
        title: "Backend Integration Group",
        courseId: "course_ood",
        groupId: "group_backend",
        ownerId: "user_teacher",
        type: "group",
        description: "Group workspace for API contracts, service boundaries, persistence, and local model integration.",
        visibility: "group",
        status: "active",
        pinned: false,
        tags: ["backend", "api", "ai"],
        createdAt: yesterday,
        updatedAt: today
      }
    ],
    roomMembers: [
      {
        id: "member_room_ood_teacher",
        roomId: "room_ood",
        userId: "user_teacher",
        displayName: "Teacher",
        role: "owner",
        status: "active",
        joinedAt: yesterday,
        notificationLevel: "all",
        createdAt: yesterday,
        updatedAt: today
      },
      {
        id: "member_room_ood_student",
        roomId: "room_ood",
        userId: "user_student",
        displayName: "Student",
        role: "member",
        status: "active",
        joinedAt: yesterday,
        notificationLevel: "mentions",
        createdAt: yesterday,
        updatedAt: today
      },
      {
        id: "member_room_design_teacher",
        roomId: "room_assignment_design",
        userId: "user_teacher",
        displayName: "Teacher",
        role: "owner",
        status: "active",
        joinedAt: yesterday,
        notificationLevel: "all",
        createdAt: yesterday,
        updatedAt: today
      },
      {
        id: "member_room_design_student",
        roomId: "room_assignment_design",
        userId: "user_student",
        displayName: "Student",
        role: "member",
        status: "active",
        joinedAt: yesterday,
        notificationLevel: "mentions",
        createdAt: yesterday,
        updatedAt: today
      },
      {
        id: "member_backend_teacher",
        roomId: "room_team_backend",
        userId: "user_teacher",
        displayName: "Teacher",
        role: "owner",
        status: "active",
        joinedAt: yesterday,
        notificationLevel: "all",
        createdAt: yesterday,
        updatedAt: today
      }
    ],
    messages: [
      {
        id: "msg_welcome",
        roomId: "room_ood",
        authorId: "user_teacher",
        content: "This week we need to finish requirement analysis, domain modeling, and the first collaboration workflow prototype.",
        sourceType: "manual",
        attachments: [],
        mentions: [],
        metadata: { milestone: "week-1" },
        createdAt: yesterday,
        updatedAt: yesterday
      },
      {
        id: "msg_assignment_scope",
        roomId: "room_assignment_design",
        authorId: "user_teacher",
        content: "@user_student Please check whether the rubric covers code quality, document quality, and team contribution evidence.",
        sourceType: "manual",
        attachments: [],
        mentions: ["user_student"],
        metadata: { rubricCheckpoint: true },
        createdAt: today,
        updatedAt: today
      },
      {
        id: "msg_backend_contract",
        roomId: "room_team_backend",
        authorId: "user_teacher",
        content: "Decision: collaboration-service should own rooms, messages, replies, mentions, tasks, summaries, and audit records.",
        sourceType: "manual",
        attachments: [],
        mentions: [],
        metadata: { decision: true },
        createdAt: today,
        updatedAt: today
      }
    ],
    messageReplies: [
      {
        id: "reply_assignment_scope_1",
        roomId: "room_assignment_design",
        messageId: "msg_assignment_scope",
        authorId: "user_student",
        content: "I will add a checklist for Git history, interface tests, and final report evidence.",
        mentions: [],
        metadata: { replyType: "commitment" },
        createdAt: today,
        updatedAt: today
      }
    ],
    mentions: [
      {
        id: "mention_assignment_student",
        roomId: "room_assignment_design",
        messageId: "msg_assignment_scope",
        replyId: null,
        actorId: "user_teacher",
        targetType: "user",
        targetId: "user_student",
        label: "user_student",
        status: "unread",
        context: "Please check whether the rubric covers code quality, document quality, and team contribution evidence.",
        createdAt: today,
        updatedAt: today
      }
    ],
    collaborationTasks: [
      {
        id: "ctask_contract_review",
        roomId: "room_team_backend",
        sourceMessageId: "msg_backend_contract",
        title: "Review collaboration API contract",
        description: "Confirm route names, payload fields, and data returned by room workspace aggregation.",
        assigneeId: "user_student",
        createdBy: "user_teacher",
        priority: "high",
        status: "doing",
        dueAt: `${today}T18:00:00.000Z`,
        labels: ["api", "contract"],
        acceptanceCriteria: ["Room list includes stats", "Workspace returns messages with replies", "Audit trail is queryable"],
        createdAt: today,
        updatedAt: today
      },
      {
        id: "ctask_rubric_checklist",
        roomId: "room_assignment_design",
        sourceMessageId: "msg_assignment_scope",
        title: "Prepare assessment evidence checklist",
        description: "Turn the discussion into a checklist that can be referenced in the final course design document.",
        assigneeId: "user_student",
        createdBy: "user_teacher",
        priority: "medium",
        status: "open",
        dueAt: `${today}T20:00:00.000Z`,
        labels: ["rubric", "report"],
        acceptanceCriteria: ["Code quality item", "Document item", "Team contribution item"],
        createdAt: today,
        updatedAt: today
      }
    ],
    roomSummaries: [
      {
        id: "summary_backend_initial",
        roomId: "room_team_backend",
        generatedBy: "user_teacher",
        rangeStart: yesterday,
        rangeEnd: today,
        summary: "The team agreed that collaboration-service should become the owner of room workspace data and publish activity events for downstream analytics.",
        decisions: ["Collaboration service owns rooms, messages, replies, mentions, tasks, summaries, and audit records."],
        actionItems: [
          {
            taskId: "ctask_contract_review",
            title: "Review collaboration API contract",
            assigneeId: "user_student",
            status: "doing"
          }
        ],
        risks: ["Need to keep old message APIs compatible with analytics and gateway calls."],
        participantCount: 2,
        messageCount: 2,
        taskCount: 1,
        createdAt: today,
        updatedAt: today
      }
    ],
    roomDecisions: [
      {
        id: "decision_backend_owner",
        roomId: "room_team_backend",
        messageId: "msg_backend_contract",
        title: "Collaboration service owns workspace state",
        rationale: "The collaboration domain needs traceable rooms, messages, replies, mentions, tasks, summaries, and audit records in one boundary.",
        impact: "Gateway and frontend should call collaboration-service for teamwork views instead of deriving workspace state from activity logs.",
        status: "accepted",
        createdBy: "user_teacher",
        approvedBy: "user_teacher",
        approvedAt: today,
        tags: ["boundary", "architecture"],
        createdAt: today,
        updatedAt: today
      }
    ],
    sharedResources: [
      {
        id: "resource_backend_api_contract",
        roomId: "room_team_backend",
        title: "Collaboration API Contract",
        url: "https://example.local/collaboration-api-contract",
        type: "document",
        description: "Reference document for room workspace payload, task state, mention status, and audit trail fields.",
        addedBy: "user_teacher",
        visibility: "room",
        tags: ["api", "contract"],
        createdAt: today,
        updatedAt: today
      },
      {
        id: "resource_assignment_rubric",
        roomId: "room_assignment_design",
        title: "Assessment Evidence Rubric",
        url: "https://example.local/assessment-evidence-rubric",
        type: "rubric",
        description: "Rubric reference for code quality, document quality, and team contribution evidence.",
        addedBy: "user_teacher",
        visibility: "room",
        tags: ["rubric", "report"],
        createdAt: today,
        updatedAt: today
      }
    ],
    checklistItems: [
      {
        id: "check_backend_routes",
        roomId: "room_team_backend",
        title: "Expose collaboration REST routes",
        description: "Rooms, messages, replies, mentions, tasks, summaries, decisions, resources, checklist, and audit must be callable from gateway.",
        ownerId: "user_student",
        status: "doing",
        dueAt: `${today}T21:00:00.000Z`,
        sourceSummaryId: "summary_backend_initial",
        sortOrder: 1,
        createdAt: today,
        updatedAt: today
      },
      {
        id: "check_frontend_workspace",
        roomId: "room_team_backend",
        title: "Render team workspace center",
        description: "The Team page should show room list, threaded discussion, task board, mentions, summaries, resources, checklist, and audit.",
        ownerId: "user_student",
        status: "open",
        dueAt: `${today}T22:00:00.000Z`,
        sourceSummaryId: "summary_backend_initial",
        sortOrder: 2,
        createdAt: today,
        updatedAt: today
      }
    ],
    handoffNotes: [
      {
        id: "handoff_backend_frontend",
        roomId: "room_team_backend",
        fromUserId: "user_teacher",
        toUserId: "user_student",
        title: "Connect collaboration workspace frontend",
        context: "Backend route expansion is ready for the Team workspace to consume rooms, threads, tasks, decisions, resources, checklist, handoffs, and audit.",
        blockers: ["Keep old /api/collaboration/messages compatible."],
        nextSteps: ["Wire ApiClient methods", "Render room workspace panels", "Run gateway integration tests"],
        status: "open",
        acceptedAt: null,
        closedAt: null,
        createdAt: today,
        updatedAt: today
      }
    ],
    auditRecords: [
      {
        id: "audit_seed_room",
        actorId: "system",
        action: "seed.loaded",
        resourceType: "room",
        resourceId: "room_ood",
        roomId: "room_ood",
        summary: "Loaded collaboration seed workspace",
        before: null,
        after: { roomId: "room_ood" },
        metadata: { source: "seed" },
        occurredAt: today,
        createdAt: today,
        updatedAt: today
      }
    ],
    activityLogs: [],
    events: []
  };
}
