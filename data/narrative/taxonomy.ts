/**
 * Hand-authored mapping from the PMMR's own table of contents to Socrata `agency`
 * codes — NOT derived from the raw agency/agency_name fields directly, because
 * those include a name typo ("Deparment of..."), non-agency cross-cutting
 * initiative codes (Vision Zero, Blueprint To End Gun Violence, etc.) that sit
 * outside the 45 agency chapters, and three separate library-system codes
 * (BPL/NYPL/QPL) that the PMMR reports as a single "Public Libraries" chapter.
 */

export interface AgencyRef {
  /** Socrata `agency` code(s) this chapter's indicators are filed under. */
  codes: string[];
  slug: string;
  name: string;
}

export interface Topic {
  slug: string;
  title: string;
  agencies: AgencyRef[];
}

export const taxonomy: Topic[] = [
  {
    slug: "public-safety-and-access-to-justice",
    title: "Public Safety and Access to Justice",
    agencies: [
      { codes: ["NYPD"], slug: "nypd", name: "New York City Police Department" },
      { codes: ["FDNY"], slug: "fdny", name: "Fire Department" },
      { codes: ["NYCEM"], slug: "nycem", name: "New York City Emergency Management" },
      { codes: ["DOC"], slug: "doc", name: "Department of Correction" },
      { codes: ["DOP"], slug: "probation", name: "Department of Probation" },
      { codes: ["CCRB"], slug: "ccrb", name: "Civilian Complaint Review Board" },
      { codes: ["LAW"], slug: "law", name: "Law Department" },
      { codes: ["DOI"], slug: "doi", name: "Department of Investigation" },
      { codes: ["CCHR"], slug: "cchr", name: "City Commission on Human Rights" },
      { codes: ["OATH"], slug: "oath", name: "Office of Administrative Trials and Hearings" },
      { codes: ["BIC"], slug: "bic", name: "Business Integrity Commission" },
    ],
  },
  {
    slug: "basic-services-for-all-new-yorkers",
    title: "Basic Services for All New Yorkers",
    agencies: [
      { codes: ["DSNY"], slug: "dsny", name: "Department of Sanitation" },
      { codes: ["DPR"], slug: "dpr", name: "Department of Parks and Recreation" },
      { codes: ["DCLA"], slug: "dcla", name: "Department of Cultural Affairs" },
      { codes: ["DCWP"], slug: "dcwp", name: "Department of Consumer and Worker Protection" },
      { codes: ["3-1-1"], slug: "311", name: "311 Customer Service Center" },
      { codes: ["TLC"], slug: "tlc", name: "Taxi and Limousine Commission" },
    ],
  },
  {
    slug: "health-and-human-services",
    title: "Health and Human Services",
    agencies: [
      { codes: ["DOHMH"], slug: "dohmh", name: "Department of Health and Mental Hygiene" },
      { codes: ["OCME"], slug: "ocme", name: "Office of Chief Medical Examiner" },
      { codes: ["NYCHH"], slug: "health-hospitals", name: "NYC Health + Hospitals" },
      { codes: ["HRA"], slug: "hra", name: "Human Resources Administration" },
      { codes: ["ACS"], slug: "acs", name: "Administration for Children's Services" },
      { codes: ["DHS"], slug: "dhs", name: "Department of Homeless Services" },
      { codes: ["DFTA"], slug: "dfta", name: "Department for the Aging" },
    ],
  },
  {
    slug: "building-human-potential",
    title: "Building Human Potential",
    agencies: [
      { codes: ["DOE"], slug: "doe", name: "Department of Education" },
      { codes: ["SCA"], slug: "sca", name: "School Construction Authority" },
      { codes: ["DYCD"], slug: "dycd", name: "Department of Youth and Community Development" },
      { codes: ["BPL", "NYPL", "QPL"], slug: "public-libraries", name: "Public Libraries" },
      { codes: ["CUNY"], slug: "cuny", name: "City University of New York" },
      { codes: ["SBS"], slug: "sbs", name: "Department of Small Business Services" },
      { codes: ["DVS"], slug: "dvs", name: "Department of Veterans' Services" },
    ],
  },
  {
    slug: "infrastructure-and-sustainability",
    title: "Infrastructure and Sustainability",
    agencies: [
      { codes: ["DEP"], slug: "dep", name: "Department of Environmental Protection" },
      { codes: ["DOT"], slug: "dot", name: "Department of Transportation" },
      { codes: ["DOB"], slug: "dob", name: "Department of Buildings" },
      { codes: ["DDC"], slug: "ddc", name: "Department of Design and Construction" },
    ],
  },
  {
    slug: "promoting-viable-communities-and-neighborhoods",
    title: "Promoting Viable Communities and Neighborhoods",
    agencies: [
      { codes: ["DCP"], slug: "dcp", name: "Department of City Planning" },
      { codes: ["EDC"], slug: "edc", name: "New York City Economic Development Corporation" },
      { codes: ["HPD"], slug: "hpd", name: "Department of Housing Preservation and Development" },
      { codes: ["NYCHA"], slug: "nycha", name: "New York City Housing Authority" },
      { codes: ["LPC"], slug: "lpc", name: "Landmarks Preservation Commission" },
    ],
  },
  {
    slug: "administrative-services",
    title: "Administrative Services",
    agencies: [
      { codes: ["DCAS"], slug: "dcas", name: "Department of Citywide Administrative Services" },
      { codes: ["DORIS"], slug: "doris", name: "Department of Records and Information Services" },
      { codes: ["DOF"], slug: "dof", name: "Department of Finance" },
      { codes: ["OTI"], slug: "oti", name: "Office of Technology and Innovation" },
      { codes: ["BOE"], slug: "boe", name: "Board of Elections" },
    ],
  },
];

export function findAgencyBySlug(agencySlug: string): { topic: Topic; agency: AgencyRef } | undefined {
  for (const topic of taxonomy) {
    const agency = topic.agencies.find((a) => a.slug === agencySlug);
    if (agency) return { topic, agency };
  }
  return undefined;
}

export function findTopicBySlug(topicSlug: string): Topic | undefined {
  return taxonomy.find((t) => t.slug === topicSlug);
}
