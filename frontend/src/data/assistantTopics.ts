// ===== FILE: src/data/assistantTopics.ts =====
// AI Assistant — topic content config.
// Add or edit topics here without touching AIAssistantWidget.tsx.
// Each topic has: an id, a short button label, keywords for free-text
// matching, and a list of steps shown one after another.

export interface AssistantStep {
  title: string;
  detail: string;
}

export interface AssistantTopic {
  id: string;
  label: string;       // shown on the topic button
  keywords: string[];  // lowercase words used to match free-typed questions
  intro?: string;       // optional one-line intro before the steps
  steps: AssistantStep[];
  note?: string;         // optional closing note/caveat
}

export const ASSISTANT_TOPICS: AssistantTopic[] = [
  {
    id: "create-request",
    label: "Create a Material Request",
    keywords: ["create", "new request", "raise", "material request", "mr", "purchase request", "add request"],
    intro: "Here's how to raise a new Material / Purchase Request:",
    steps: [
      { title: "Open Create Request", detail: "Go to Requests → Create Request from the left menu." },
      { title: "Select Company & Project", detail: "Choose your Company, then pick the Project (Department auto-fills if the project has one)." },
      { title: "Fill Delivery Location & Contact Number", detail: "Both are required before you can submit." },
      { title: "Pick an Item Category", detail: "Use the category tabs (IT, ASSET, LOGISTICS, etc.) to narrow the item list, or leave it on \"All Items\"." },
      { title: "Add items", detail: "Search by item code or name, set Quantity, UOM, and Required Date, then click \"+ Add Item\"." },
      { title: "Attach a file if needed", detail: "Optional — attach an image or document to any item before adding it." },
      { title: "Submit", detail: "Click \"Submit for Approval\" to send it into the workflow, or \"Save Draft\" to finish later." },
    ],
  },
  {
    id: "check-status",
    label: "Check my request status",
    keywords: ["status", "track", "where is my request", "approval status", "pending"],
    intro: "To check where your request currently stands:",
    steps: [
      { title: "Go to My Requests", detail: "Open Requests → My Requests." },
      { title: "Find your request", detail: "Use the status filters (Draft, Pending Approval, Approved, Rejected, Returned...) or the date filter to locate it." },
      { title: "Read the Status & Stage column", detail: "It shows the current status, and for Pending/Returned/Rejected requests, exactly which approval stage it's at." },
      { title: "Click View for full detail", detail: "Opens the complete approval trail — every stage, who approved it, and when." },
    ],
  },
  {
    id: "who-approves",
    label: "Who approves my request",
    keywords: ["who approves", "approver", "approval flow", "workflow", "next approver"],
    intro: "Approval routing is automatic and depends on your company and the item category:",
    steps: [
      { title: "Routing is dynamic", detail: "Each company has its own approval flow, configured per item category (IT, ASSET, LOGISTICS, etc.) — there's no fixed single approver." },
      { title: "See who's next", detail: "Open the request in My Requests and check \"Awaiting: ...\" under the status — this names the current pending stage." },
      { title: "See the full chain", detail: "Click View → Approval Trail to see every stage in order, completed and pending." },
    ],
    note: "If a stage seems stuck for a long time, contact your Purchase Manager or IT for follow-up.",
  },
  {
    id: "convert-to-po",
    label: "Convert MR to Purchase Order",
    keywords: ["convert", "purchase order", "po", "international po", "local po"],
    intro: "This step is for the Procurement team, not requesters. Here's the flow:",
    steps: [
      { title: "Open Procurement Queue", detail: "Go to Procurement → Procurement Queue — it lists approved MRs ready for conversion." },
      { title: "Select an MR", detail: "Click into an approved MR to see its items and how much of each is still unallocated." },
      { title: "Choose Local or International", detail: "Pick the PO type based on the supplier — Local POs are locked to QAR currency automatically." },
      { title: "Pull items", detail: "Select the items/quantities to include — partial and split conversions across multiple POs are supported." },
      { title: "Save the PO", detail: "The PO is created in Draft; it can later be marked Complete once a PO number is assigned." },
    ],
    note: "Only Purchase Officers/Managers with Procurement Queue access can do this step.",
  },
  {
    id: "store-verification",
    label: "How Store Verification works",
    keywords: ["store", "verification", "stock", "store keeper", "available quantity"],
    intro: "Store Verification checks existing stock before a request goes to purchase:",
    steps: [
      { title: "Store Keeper reviews the request", detail: "After certain approval stages, items route to the Store Keeper for a stock check." },
      { title: "Per-item stock findings", detail: "For each item, the Store Keeper records the Available Quantity in stock." },
      { title: "Purchase quantity is adjusted", detail: "Only the shortfall (requested minus available) moves forward for purchase — if fully in stock, the item is marked Fulfilled From Stock." },
      { title: "Remarks", detail: "The Store Keeper can add remarks explaining the stock finding, visible on the request detail view." },
    ],
  },
  {
    id: "attachments",
    label: "How to attach files to a request",
    keywords: ["attach", "attachment", "upload file", "upload image", "photo"],
    intro: "You can attach a supporting file to any item on a request:",
    steps: [
      { title: "While adding an item", detail: "In the item form, click \"Attach file\" before clicking \"+ Add Item\"." },
      { title: "Supported types", detail: "Images (jpg, png, gif, webp), PDF, Word, and Excel files." },
      { title: "Select company first", detail: "You must pick a Company on the request before attaching a file." },
      { title: "Preview later", detail: "In My Requests → View, click an attached image to preview it, or use the Download button." },
    ],
  },
  {
    id: "categories",
    label: "What are the item categories",
    keywords: ["category", "categories", "item category", "it asset logistics"],
    intro: "Requests are organized into 10 item categories, each with its own approval routing:",
    steps: [
      { title: "IT", detail: "Computers, software, IT equipment and accessories." },
      { title: "ASSET", detail: "Fixed/company assets — furniture, machinery, tools." },
      { title: "LOGISTICS", detail: "Transport, shipping, warehousing needs." },
      { title: "PROJECT / CIVIL", detail: "Project-linked materials and civil/bulk construction materials." },
      { title: "FMCG_FOOD / FMCG_NFOOD", detail: "Fast-moving consumer goods — food and non-food." },
      { title: "SAFETY / UNIFORM / GENERAL", detail: "Safety equipment, staff uniforms, and anything not covered above." },
    ],
    note: "Pick the category that best matches your item — it decides which approvers see the request.",
  },
  {
    id: "procurement-queue",
    label: "How to use the Procurement Queue",
    keywords: ["procurement queue", "queue", "buyer", "purchase officer"],
    intro: "The Procurement Queue is the Purchase team's worklist of approved MRs:",
    steps: [
      { title: "Open the Queue", detail: "Go to Procurement → Procurement Queue." },
      { title: "Visibility rule", detail: "Purchase Officers see only MRs assigned to them; Purchase Managers see the full queue." },
      { title: "Track allocation", detail: "Each MR shows how much has already been converted to a PO and how much remains." },
      { title: "Convert or split", detail: "From here you create Local/International POs, partially or fully, against each MR." },
    ],
  },
  {
    id: "resubmit-returned",
    label: "Fix and resubmit a Returned request",
    keywords: ["returned", "resubmit", "return", "correct", "rejected", "fix my request"],
    intro: "If an approver returns your request for correction:",
    steps: [
      { title: "Go to My Requests", detail: "Find the request with a \"Returned\" status (orange badge)." },
      { title: "Check why it was returned", detail: "Click View — the orange banner shows the approver's comment and which stage returned it." },
      { title: "Click Edit Request", detail: "This opens the request in edit mode so you can correct items or details." },
      { title: "Make your corrections", detail: "Update quantities, items, justification, or attachments as needed." },
      { title: "Click Save & Resubmit", detail: "This sends the corrected request back into the approval flow from the start." },
    ],
  },
  {
    id: "cancel-delete",
    label: "Cancel or delete a request",
    keywords: ["cancel", "delete", "remove request", "withdraw"],
    intro: "Only Draft requests can be removed:",
    steps: [
      { title: "Go to My Requests", detail: "Find the request — it must still show \"Draft\" status." },
      { title: "Click View", detail: "Opens the request detail modal." },
      { title: "Click Delete Draft", detail: "Permanently removes the draft. This cannot be undone." },
    ],
    note: "Once a request is Submitted or Returned, there's no direct cancel option — you can only edit and resubmit, or ask your approver to reject it.",
  },
];

// Simple free-text matcher: scores each topic by how many keywords appear
// in the user's typed message, returns the best match (or null).
export function matchTopic(query: string): AssistantTopic | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  let best: AssistantTopic | null = null;
  let bestScore = 0;

  for (const topic of ASSISTANT_TOPICS) {
    let score = 0;
    for (const kw of topic.keywords) {
      if (q.includes(kw)) score += kw.split(" ").length; // multi-word keywords score higher
    }
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }

  return bestScore > 0 ? best : null;
}