locals {
  name_prefix = "${var.celo_env}-${var.name}"
}

resource "google_compute_address" "full_node" {
  name         = "${local.name_prefix}-address-${count.index}-${random_id.full_node[count.index].hex}"
  address_type = "EXTERNAL"

  count = var.node_count

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_instance" "full_node" {
  name         = "${local.name_prefix}-${count.index}-${random_id.full_node[count.index].hex}"
  machine_type = "n1-standard-1"

  count = var.node_count

  allow_stopping_for_update = true

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-9"
    }
  }

  scratch_disk {

  }

  network_interface {
    network = var.network_name
    access_config {
      nat_ip = google_compute_address.full_node[count.index].address
    }
  }

  metadata_startup_script = templatefile(
    format("%s/startup.sh", path.module), {
      additional_geth_flags : var.additional_geth_flags,
      block_time : var.block_time,
      bootnode_ip_address : var.bootnode_ip_address,
      ethstats_host : var.ethstats_host,
      gcloud_secrets_base_path : var.gcloud_secrets_base_path,
      gcloud_secrets_bucket : var.gcloud_secrets_bucket,
      genesis_content_base64 : var.genesis_content_base64,
      geth_node_docker_image_repository : var.geth_node_docker_image_repository,
      geth_node_docker_image_tag : var.geth_node_docker_image_tag,
      geth_verbosity : var.geth_verbosity,
      in_memory_discovery_table : var.in_memory_discovery_table,
      ip_address : google_compute_address.full_node[count.index].address,
      max_peers : var.node_count * 2,
      name : var.name,
      network_id : var.network_id,
      node_name : "${var.celo_env}-${var.name}-${count.index}",
      rid : count.index,
      verification_pool_url : var.verification_pool_url
    }
  )

  service_account {
    email = var.gcloud_vm_service_account_email
    scopes = [
      "https://www.googleapis.com/auth/devstorage.read_only",
      "https://www.googleapis.com/auth/logging.write"
    ]
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "random_id" "full_node" {
  count = var.node_count

  byte_length = 8
}